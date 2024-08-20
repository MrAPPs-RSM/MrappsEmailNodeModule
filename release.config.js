const publishCommands = `
git push --force origin \${nextRelease.version} || exit 3
echo "release_status=released" >> $GITHUB_ENV
`;

module.exports = {
  branches: ['master'],
  tagFormat: '${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/github',
    {
      path: '@semantic-release/npm',
      npmPublish: true,
    },
    {
      path: '@semantic-release/git',
      assets: ['CHANGELOG.md', 'package.json'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    },
    {
      path: '@semantic-release/exec',
      publishCmd: publishCommands
    }
  ],
};
