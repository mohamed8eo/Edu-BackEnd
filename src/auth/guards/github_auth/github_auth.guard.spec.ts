import { GithubAuthGuard } from './github_auth.guard';

describe('GithubAuthGuard', () => {
  it('should be defined', () => {
    expect(new GithubAuthGuard()).toBeDefined();
  });
});
