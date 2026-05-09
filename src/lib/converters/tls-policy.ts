/**
 * TLS automation policy converter: Caddy JSON ↔ form values.
 */

import {
  type IssuerFormValues,
  issuerDefaults,
  type TlsPolicyFormValues,
  tlsPolicyFormDefaults,
} from "@/lib/schemas/tls-policy";
import type { AutomationPolicy, TlsIssuer } from "@/types/tls-app";

export function issuerToFormState(issuer: TlsIssuer): IssuerFormValues {
  return {
    module: (issuer.module as IssuerFormValues["module"]) || "acme",
    email: issuer.email ?? "",
    ca: issuer.ca ?? "",
    httpChallengeDisabled: issuer.challenges?.http?.disabled ?? false,
    tlsAlpnChallengeDisabled: issuer.challenges?.["tls-alpn"]?.disabled ?? false,
  };
}

export function formStateToIssuer(state: IssuerFormValues): TlsIssuer {
  const issuer: TlsIssuer = { module: state.module };

  if (state.email) {
    issuer.email = state.email;
  }

  if (state.module === "acme" || state.module === "zerossl") {
    if (state.ca) {
      issuer.ca = state.ca;
    }
    if (state.httpChallengeDisabled || state.tlsAlpnChallengeDisabled) {
      issuer.challenges = {};
      if (state.httpChallengeDisabled) {
        issuer.challenges.http = { disabled: true };
      }
      if (state.tlsAlpnChallengeDisabled) {
        issuer.challenges["tls-alpn"] = { disabled: true };
      }
    }
  }

  return issuer;
}

export function parsePolicy(policy: AutomationPolicy | undefined): TlsPolicyFormValues {
  if (!policy) return tlsPolicyFormDefaults;
  return {
    subjects: policy.subjects?.join(", ") ?? "",
    issuers:
      policy.issuers && policy.issuers.length > 0
        ? policy.issuers.map(issuerToFormState)
        : [issuerDefaults],
    keyType: policy.key_type ?? "",
    onDemand: policy.on_demand ?? false,
    mustStaple: policy.must_staple ?? false,
  };
}

export function toPolicy(
  values: TlsPolicyFormValues,
  original?: AutomationPolicy,
): AutomationPolicy {
  const policy: AutomationPolicy = { ...original };

  const subjectList = values.subjects
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (subjectList.length > 0) {
    policy.subjects = subjectList;
  } else {
    delete policy.subjects;
  }

  const issuerObjects = values.issuers.map(formStateToIssuer);
  if (issuerObjects.length > 0) {
    policy.issuers = issuerObjects;
  } else {
    delete policy.issuers;
  }

  if (values.keyType) {
    policy.key_type = values.keyType;
  } else {
    delete policy.key_type;
  }

  if (values.onDemand) {
    policy.on_demand = true;
  } else {
    delete policy.on_demand;
  }
  if (values.mustStaple) {
    policy.must_staple = true;
  } else {
    delete policy.must_staple;
  }

  return policy;
}
