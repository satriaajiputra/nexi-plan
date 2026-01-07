import { success, error, info, warning } from "../utils/format.js";
import { $ } from "bun";

const REPO = "satriaajiputra/nexi-plan";
const API_BASE = "https://api.github.com";

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

interface PlatformInfo {
  platform: string;
  arch: string;
  binaryName: string;
}

/**
 * Get current platform information
 */
function getPlatform(): PlatformInfo | null {
  const platform = process.platform;
  const arch = process.arch;

  // Map to our binary names
  const platformMap: Record<string, string> = {
    linux: "linux",
    darwin: "macos",
    win32: "windows",
  };

  const archMap: Record<string, string> = {
    x64: "amd64",
    arm64: "arm64",
    x86: "amd64",
    ia32: "amd64",
  };

  if (!platformMap[platform]) {
    error(`Unsupported platform: ${platform}`);
    return null;
  }

  if (!archMap[arch]) {
    error(`Unsupported architecture: ${arch}`);
    return null;
  }

  const osName = platformMap[platform];
  const archName = archMap[arch];
  const ext = platform === "win32" ? ".exe" : "";
  const binaryName = `np-${osName}-${archName}${ext}`;

  return { platform, arch, binaryName };
}

/**
 * Get the path to the current executable
 */
function getExecutablePath(): string {
  // In Bun, process.argv[1] is the script path
  // For compiled binaries, process.execPath is the binary path
  const execPath = process.execPath;

  // Check if running as compiled binary
  if (!execPath.includes("bun")) {
    return execPath;
  }

  // Running in development mode
  error("Not running as compiled binary. Run 'bun run build' first.");
  process.exit(1);
}

/**
 * Fetch latest release from GitHub
 */
async function getLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(`${API_BASE}/repos/${REPO}/releases/latest`);
    if (!response.ok) {
      error(`Failed to fetch release info: ${response.statusText}`);
      return null;
    }
    const data = await response.json() as GitHubRelease;
    return data;
  } catch (err) {
    error(`Failed to fetch release info: ${err}`);
    return null;
  }
}

/**
 * Download file to temporary location
 */
async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    info(`Downloading from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      error(`Download failed: ${response.statusText}`);
      return false;
    }

    const buffer = await response.arrayBuffer();
    await Bun.write(dest, buffer);
    return true;
  } catch (err) {
    error(`Download failed: ${err}`);
    return false;
  }
}

/**
 * Verify checksum
 */
async function verifyChecksum(binaryPath: string, checksumUrl: string): Promise<boolean> {
  try {
    const response = await fetch(checksumUrl);
    if (!response.ok) {
      warning("Could not download checksum file. Skipping verification.");
      return true; // Continue anyway
    }

    const checksumContent = await response.text();
    const expectedChecksum = checksumContent.split(/\s+/)[0];

    // Calculate local checksum
    const proc = Bun.spawn(["sha256sum", binaryPath], {
      stdout: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const actualChecksum = output.split(/\s+/)[0];

    if (expectedChecksum !== actualChecksum) {
      error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
      return false;
    }

    success("Checksum verified");
    return true;
  } catch (err) {
    warning(`Checksum verification failed: ${err}. Continuing anyway.`);
    return true;
  }
}

/**
 * Replace the current executable
 */
async function replaceExecutable(newBinary: string, currentPath: string): Promise<boolean> {
  try {
    info(`Installing to: ${currentPath}`);

    // On Unix-like systems, we need to:
    // 1. Make the new binary executable
    // 2. Move it to replace the old one
    // On Windows, we can just overwrite

    if (process.platform === "win32") {
      await $`mv ${newBinary} ${currentPath}`;
    } else {
      await $`chmod +x ${newBinary}`;
      await $`mv ${newBinary} ${currentPath}`;
    }

    return true;
  } catch (err) {
    error(`Failed to install: ${err}`);
    return false;
  }
}

/**
 * Self-update the CLI
 */
export async function selfUpdate(): Promise<void> {
  info("Checking for updates...");

  // Get platform info
  const platform = getPlatform();
  if (!platform) {
    return;
  }

  // Get latest release
  const release = await getLatestRelease();
  if (!release) {
    return;
  }

  info(`Latest version: ${release.tag_name}`);

  // Find the appropriate binary
  const binaryAsset = release.assets.find((a) => a.name === platform.binaryName);
  if (!binaryAsset) {
    error(`Could not find binary for ${platform.platform}-${platform.arch}`);
    return;
  }

  // Check if checksum exists
  const checksumAsset = release.assets.find((a) => a.name === `${platform.binaryName}.sha256`);

  // Download to temp file
  const tmpDir = "/tmp";
  const tmpBinary = `${tmpDir}/${platform.binaryName}`;
  const tmpChecksum = `${tmpBinary}.sha256`;

  info("Downloading new binary...");
  const downloaded = await downloadFile(binaryAsset.browser_download_url, tmpBinary);
  if (!downloaded) {
    return;
  }

  // Verify checksum if available
  if (checksumAsset) {
    const checksumDownloaded = await downloadFile(checksumAsset.browser_download_url, tmpChecksum);
    if (checksumDownloaded) {
      const verified = await verifyChecksum(tmpBinary, tmpChecksum);
      if (!verified) {
        return;
      }
    }
  }

  // Get current executable path
  const currentPath = getExecutablePath();

  // Replace executable
  info("Installing update...");
  const replaced = await replaceExecutable(tmpBinary, currentPath);
  if (!replaced) {
    return;
  }

  success(`Updated to ${release.tag_name}!`);
  info(`Release notes: ${release.html_url}`);
}
