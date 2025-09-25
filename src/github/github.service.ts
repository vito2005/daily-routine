import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import dayjs from 'dayjs';

@Injectable()
export class GithubService {
  private readonly octokit: Octokit;
  private readonly repos: string[];
  private readonly author: string;
  private readonly preferredBranch: string | undefined;

  constructor() {
    const token = process.env.GITHUB_TOKEN ?? '';
    this.octokit = new Octokit({ auth: token || undefined });
    const reposEnv = process.env.GITHUB_REPOS ?? '';
    this.repos = reposEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.author = process.env.GITHUB_AUTHOR ?? '';
    this.preferredBranch =
      (process.env.GITHUB_BRANCH || '').trim() || undefined;
  }

  async getDailyCommitDigest(date: Date = new Date()): Promise<string> {
    const start = '2025-07-22T00:00:00Z'; //dayjs(date).startOf('day').toISOString();
    const end = dayjs(date).endOf('day').toISOString();
    if (this.repos.length === 0) return 'Нет настроенных репозиториев';

    const lines: string[] = [];
    for (const repo of this.repos) {
      const [owner, repoName] = repo.split('/');
      if (!owner || !repoName) continue;

      // Определяем ветку: пробуем preferredBranch, иначе default_branch
      let branchToUse: string | undefined = this.preferredBranch;
      try {
        if (branchToUse) {
          // Проверим, что ветка существует
          await this.octokit.git.getRef({
            owner,
            repo: repoName,
            ref: `heads/${branchToUse}`,
          });
        } else {
          const repoInfo = await this.octokit.repos.get({
            owner,
            repo: repoName,
          });
          branchToUse = repoInfo.data.default_branch;
        }
      } catch (e) {
        // Если preferred ветка не найдена, откатываемся на default_branch
        const repoInfo = await this.octokit.repos.get({
          owner,
          repo: repoName,
        });
        branchToUse = repoInfo.data.default_branch;
      }

      const params: any = {
        owner,
        repo: repoName,
        since: start,
        until: end,
        per_page: 100,
        sha: branchToUse,
      };
      if (this.author) {
        params.author = this.author;
      }

      let commits;
      try {
        commits = await this.octokit.repos.listCommits(params);
      } catch (err) {
        // Если всё равно 404/422 — пропускаем репозиторий
        lines.push(
          `Repo ${owner}/${repoName}: не удалось получить коммиты (ветка: ${branchToUse}).`,
        );
        lines.push('');
        continue;
      }

      if (commits.data.length === 0) continue;
      lines.push(`Repo ${owner}/${repoName}:`);
      for (const c of commits.data) {
        const message = c.commit.message.split('\n')[0];
        const sha = c.sha.substring(0, 7);
        lines.push(`- ${message} (${sha})`);
      }
      lines.push('');
    }

    return lines.length ? lines.join('\n') : 'Коммитов за день не найдено';
  }
}
