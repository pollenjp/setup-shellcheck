import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as os from 'os'
import { versionInput, githubTokenInput } from './inputs'
import {
  CMD_NAME,
  OWNER,
  REPO,
  TOOL_CACHE_NAME,
  RETRY_COUNT
} from './constants'

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

interface ReleaseResponse {
  tag_name: string
}

/**
 * Parse the input version to the version of shellcheck to download
 * @param version 'latest' or 'x.y.z'
 * @returns 'x.y.z'
 */
const getVersion = async (version: string): Promise<string> => {
  switch (version) {
    case 'latest': {
      // curl -s https://api.github.com/repos/${OWNER}/${REPO}/releases/latest | jq -r '.tag_name'
      const response = await (async () => {
        for (let i = 0; i < RETRY_COUNT; i++) {
          try {
            const res = await fetch(
              `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
              {
                headers: githubTokenInput
                  ? {
                      Authorization: `Bearer ${githubTokenInput}`
                    }
                  : undefined
              }
            )
            if (res.status !== 200) {
              throw new Error(
                `Fetching the latest release page (${res.statusText})`
              )
            }
            return res
          } catch (error) {
            core.warning(
              `${(error as Error).message} Retry... ${i + 1}/${RETRY_COUNT}`
            )
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
        throw new Error(
          `Failed to get the latest version. If the reason is rate limit, please set the github_token. https://github.com/actions/runner-images/issues/602`
        )
      })()
      const releaseResponse: ReleaseResponse =
        (await response.json()) as ReleaseResponse
      const tagName: string = releaseResponse.tag_name
      if (typeof tagName !== 'string') {
        throw new Error(`Invalid type of tag name.`)
      }
      return tagName.replace(/^v/, '')
    }
    default:
      return version
  }
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
