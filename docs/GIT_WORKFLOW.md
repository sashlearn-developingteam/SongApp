# Git workflow for Song App

This project is intended to be updated through Git after the first clone. Do not copy `node_modules`, `out`, `release`, or `.env` into Git.

## First clone

```powershell
git clone <YOUR_REPOSITORY_URL>
cd Song-App
npm install
Copy-Item .env.example .env
notepad .env
npm run verify:windows
npm run dev
```

## Pull the latest version

Before pulling, check whether you changed code locally:

```powershell
git status
```

If the working tree is clean:

```powershell
git pull --ff-only
npm install
npm run verify:windows
npm run dev
```

`npm install` is safe to repeat after a pull and picks up dependency changes. Song App's postinstall/predev runtime check repairs a missing Electron binary when needed.

## Make your own change

Create a branch instead of editing the shared branch directly:

```powershell
git switch -c feature/my-change
# edit files
git add .
git commit -m "feat: describe the change"
git push -u origin feature/my-change
```

After the branch is merged on GitHub:

```powershell
git switch main
git pull --ff-only
git branch -d feature/my-change
```

## If `git pull` refuses because you have local changes

Do not use `git reset --hard` unless you intentionally want to destroy those changes. Either commit them:

```powershell
git switch -c wip/local-work
git add .
git commit -m "wip: save local work"
```

or stash them temporarily:

```powershell
git stash push -u -m "local Song App work"
git pull --ff-only
git stash pop
```

Resolve any merge conflict deliberately before continuing.

## Files that stay local

- `.env`
- `node_modules/`
- `out/`
- `release/`
- logs and coverage output

Never commit Spotify credentials, tokens, or other secrets.
