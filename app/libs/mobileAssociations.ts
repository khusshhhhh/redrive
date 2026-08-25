const productionBundleId = "au.com.redrive.app";
const productionAndroidPackage = "au.com.redrive.app";
const appleTeamIdPattern = /^[A-Z0-9]{10}$/;
const sha256FingerprintPattern = /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/;

export type MobileAssociationEnvironment = {
  appleTeamId?: string;
  iosBundleId?: string;
  androidPackage?: string;
  androidFingerprints?: string;
};

export function buildAppleAssociation(environment: MobileAssociationEnvironment) {
  const teamId = environment.appleTeamId?.trim().toUpperCase();
  const bundleId = environment.iosBundleId?.trim() || productionBundleId;
  if (!teamId || !appleTeamIdPattern.test(teamId)) throw new Error("MOBILE_APPLE_TEAM_ID must be a 10-character Apple Team ID");
  if (!/^au\.com\.redrive\.app(?:\.[a-z]+)?$/.test(bundleId)) throw new Error("MOBILE_IOS_BUNDLE_ID is not an approved Redrive identifier");
  const appId = `${teamId}.${bundleId}`;
  return {
    applinks: {
      details: [{
        appIDs: [appId],
        components: [
          { "/": "/listings/*", comment: "Public vehicle listing" },
          { "/": "/trips/*", comment: "Authorized trip detail" },
          { "/": "/messages/*", comment: "Authorized conversation" },
        ],
      }],
    },
  };
}

export function buildAndroidAssociation(environment: MobileAssociationEnvironment) {
  const packageName = environment.androidPackage?.trim() || productionAndroidPackage;
  if (!/^au\.com\.redrive\.app(?:\.[a-z]+)?$/.test(packageName)) throw new Error("MOBILE_ANDROID_PACKAGE is not an approved Redrive identifier");
  const fingerprints = (environment.androidFingerprints || "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);
  if (!fingerprints.length || fingerprints.some((value) => !sha256FingerprintPattern.test(value))) {
    throw new Error("MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS must contain valid comma-separated SHA-256 fingerprints");
  }
  return [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
  }];
}
