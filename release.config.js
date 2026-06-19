const prepareCommands = `
npm version \${nextRelease.version} --no-git-tag-version
echo "RELEASE_VERSION=\${nextRelease.version}" >> $GITHUB_ENV
`;

const publishCommands = `
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
    [
      '@semantic-release/exec',
      {
        prepareCmd: prepareCommands,
        publishCmd: publishCommands,
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message:
            'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};