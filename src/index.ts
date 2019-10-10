import * as simplegit from 'simple-git/promise';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import { promisify } from 'util';
import * as childProcess from 'child_process';
import * as ncp from 'ncp';

const git = simplegit();
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const exec = promisify(childProcess.exec);
const rmrf = promisify(rimraf);
const copy = promisify(ncp);

async function cloneIfNeeded(url, dest) {
  const repoExists = await exists(dest);
  if(!repoExists) {
    await git.clone(url, dest);
  }

  return simplegit(dest);
}

async function runCommand(command:string, cwd:string) {
  const { stdout, stderr } = await exec(command, { cwd });
  console.log(stdout);
  console.log(stderr);
}

async function build(cwd:string) {
  await runCommand('npm ci', cwd);
  await runCommand('npm run build', cwd);
}

async function recreate(path:string) {
  await rmrf(path);
  await mkdir(path);
}

async function refresh(path:string, remoteUrl:string) {
  const repo = await cloneIfNeeded(remoteUrl, path);

  await repo.checkout('master');
  await repo.pull();

  await build(path);
}

async function run() {
  await refresh('./repos/ajc-back', 'git@github.com:ALJCepeda/ajcepeda-back.git');
  await refresh('./repos/ajc-front','git@github.com:ALJCepeda/ajcepeda-front.git');

  await recreate('./dist');
  await copy('./repos/ajc-back/dist', './dist');
  await copy('./repos/ajc-front/dist', './dist');
  await copy('./repos/ajc-back/package.json', './dist/package.json');
  await copy('./repos/ajc-back/package-lock.json', './dist/package-lock.json');
  await copy('./repos/ajc-front/src/index.html', './dist/index.html');
  await copy('./.env.local', './dist/.env');

  await runCommand('npm ci', './dist');
}

run().then(() => {
  console.log('Done!');
});
