import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as os from 'os'
import { versionInput } from './inputs'
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
      CMD_NAME,
      TOOL_CACHE_NAME,
      version
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
      // curl -s https://api.github.com/repos/mvdan/sh/releases/latest | jq -r '.tag_name'

      const response = await (async () => {
        for (let i = 0; i < RETRY_COUNT; i++) {
          try {
            return await fetch(
              `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`
            )
          } catch (error) {
            core.warning(
              `Failed to get the latest version of ${CMD_NAME}. (${(error as Error).message}) Retry... ${i + 1}/${RETRY_COUNT}`
            )
          }
        }
        throw new Error(`Failed to get the latest version of ${CMD_NAME}.`)
      })()
      const releaseResponse: ReleaseResponse =
        (await response.json()) as ReleaseResponse
      const tagName: string = releaseResponse.tag_name
      if (typeof tagName !== 'string') {
        throw new Error(`Failed to get the latest version of ${CMD_NAME}.`)
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
