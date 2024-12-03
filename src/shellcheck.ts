import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as os from 'os'
import { versionInput, githubTokenInput } from './inputs'
import { CMD_NAME, OWNER, REPO, TOOL_CACHE_NAME } from './constants'

export const setupShellcheck = async (): Promise<void> => {
  const version = await getVersion(versionInput)

  let toolPath = findVersionInHostedToolCacheDirectory(version)
  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`)
  } else {
    const downloadUrl = `${getDownloadBaseUrl(version)}/${CMD_NAME}-v${version}.${translateOsPlatformToDistPlatformName()}.${translateArchToDistArchName()}.tar.xz`
    core.info(`Downloading from ${downloadUrl}`)
    const downloadPath = await tc.downloadTool(downloadUrl)
    const extractedPath = await tc.extractTar(downloadPath, undefined, ['x'])
    toolPath = await tc.cacheDir(
      `${extractedPath}`,
      TOOL_CACHE_NAME,
      version,
      translateArchToDistArchName()
    )
    core.info(`Downloaded to ${toolPath}`)
  }
  const binPath = `${toolPath}/${CMD_NAME}-v${version}`
  core.addPath(binPath)
}

/**
 * Parse the input version to the version of shellcheck to download
 * @param version 'latest' or 'x.y.z'
 * @returns 'x.y.z'
 */
const getVersion = async (version: string): Promise<string> => {
  if (version === 'latest') {
    return await getLatestVersion(githubTokenInput)
  }

  if (tc.isExplicitVersion(version)) {
    core.debug(`Version ${version} is an explicit version.`)
    return version
  }

  throw new Error(`Invalid version: ${version}`)
}

interface ReleaseResponse {
  tag_name: string
}

/**
 * Get the latest version. Support anonymous request.
 * @param githubToken
 * @returns 'X.Y.Z'
 */
async function getLatestVersion(githubToken?: string): Promise<string> {
  const response = await (async () => {
    try {
      return await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
        {
          headers: githubToken
            ? {
                Authorization: `Bearer ${githubToken}`
              }
            : undefined
        }
      )
    } catch (error) {
      core.error(
        `Failed to fetching the latest release page. If you are using GHE, 'github-token' should be empty. If you reach the rate limit, please set 'github-token' for 'github.com'.`
      )
      throw new Error(
        `Fetching the latest release page (${(error as Error).message})`
      )
    }
  })()

  if (response.status !== 200) {
    throw new Error(`Fetching the latest release page (${response.statusText})`)
  }

  const data: ReleaseResponse = (await response.json()) as ReleaseResponse
  return data.tag_name.replace(/^v/, '')
}

export const getDownloadBaseUrl = (version: string): URL => {
  switch (version) {
    case 'latest':
      return new URL(
        `https://github.com/${OWNER}/${REPO}/releases/latest/download`
      )
    default:
      return new URL(
        `https://github.com/${OWNER}/${REPO}/releases/download/v${version}`
      )
  }
}

const findVersionInHostedToolCacheDirectory = (version: string): string => {
  return tc.find(TOOL_CACHE_NAME, version, translateArchToDistArchName())
}

const translateOsPlatformToDistPlatformName = (): string => {
  switch (os.platform()) {
    case 'darwin':
      return 'darwin'
    case 'linux':
      return 'linux'
    default:
      throw new Error(`Unsupported platform: ${os.platform()}.`)
  }
}

/**
 *
 * os.arch(): 'arm', 'arm64', 'ia32', 'loong64', 'mips', 'mipsel', 'ppc', 'ppc64', 'riscv64', 's390', 's390x', and 'x64'
 * ->
 * shellcheck-v0.10.0.darwin.aarch64.tar.xz
 * shellcheck-v0.10.0.darwin.x86_64.tar.xz
 * shellcheck-v0.10.0.linux.aarch64.tar.xz
 * shellcheck-v0.10.0.linux.armv6hf.tar.xz
 * shellcheck-v0.10.0.linux.riscv64.tar.xz
 * shellcheck-v0.10.0.linux.x86_64.tar.xz
 *
 * @param arch
 * @returns
 */
const translateArchToDistArchName = (): string => {
  switch (os.arch()) {
    case 'x64':
      return 'x86_64'
    case 'arm64':
      return 'aarch64'
    case 'arm': // linux only
      return 'armv6hf'
    case 'riscv64': // linux only
      return 'riscv64'
    default:
      throw new Error(
        `Unsupported architecture: ${os.arch()}. Use go install instead.`
      )
  }
}
