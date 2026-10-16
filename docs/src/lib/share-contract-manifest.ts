const SHARE_CONTRACT_EPOCH = 2;
export const SHARE_CONTRACT_CORPUS_SHA256 =
  'b97f34f09cbf041fa5f00de5b1b5fc6d612e0b3d2f9236aea2caea20eaf48c26';

export interface ShareContractManifest {
  epoch: typeof SHARE_CONTRACT_EPOCH;
  corpusSha256: string;
  deploymentSha: string;
}

export function buildShareContractManifest(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ShareContractManifest {
  return {
    epoch: SHARE_CONTRACT_EPOCH,
    corpusSha256: SHARE_CONTRACT_CORPUS_SHA256,
    deploymentSha: environment.VERCEL_GIT_COMMIT_SHA ?? environment.GITHUB_SHA ?? 'unavailable',
  };
}
