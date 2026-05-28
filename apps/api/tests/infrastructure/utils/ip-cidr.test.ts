/* Levers AR-200: unit tests for ipMatchesCidrs. */

import { describe, it, expect } from "vitest";
import { ipMatchesCidrs } from "@/infrastructure/utils/ip-cidr";

describe("ipMatchesCidrs — defaults + empty cases", () => {
  it("empty cidrs array = no restriction (always true)", () => {
    expect(ipMatchesCidrs("1.2.3.4", [])).toBe(true);
  });

  it("null / undefined cidrs = no restriction", () => {
    expect(ipMatchesCidrs("1.2.3.4", null as unknown as string[])).toBe(true);
    expect(ipMatchesCidrs("1.2.3.4", undefined as unknown as string[])).toBe(true);
  });

  it("non-empty cidrs but null/missing request IP -> no match", () => {
    expect(ipMatchesCidrs(null, ["1.2.3.4/32"])).toBe(false);
    expect(ipMatchesCidrs(undefined, ["1.2.3.4/32"])).toBe(false);
    expect(ipMatchesCidrs("", ["1.2.3.4/32"])).toBe(false);
  });
});

describe("ipMatchesCidrs — IPv4 prefix matching", () => {
  it("/32 = exact host match", () => {
    expect(ipMatchesCidrs("1.2.3.4", ["1.2.3.4/32"])).toBe(true);
    expect(ipMatchesCidrs("1.2.3.5", ["1.2.3.4/32"])).toBe(false);
  });

  it("/24 = same /24 subnet matches", () => {
    expect(ipMatchesCidrs("192.168.1.10", ["192.168.1.0/24"])).toBe(true);
    expect(ipMatchesCidrs("192.168.1.255", ["192.168.1.0/24"])).toBe(true);
    expect(ipMatchesCidrs("192.168.2.10", ["192.168.1.0/24"])).toBe(false);
  });

  it("/0 = match everything", () => {
    expect(ipMatchesCidrs("8.8.8.8", ["0.0.0.0/0"])).toBe(true);
    expect(ipMatchesCidrs("203.0.113.1", ["0.0.0.0/0"])).toBe(true);
  });

  it("OR semantics across multiple CIDRs (match any)", () => {
    expect(ipMatchesCidrs("10.0.0.5", ["192.168.0.0/16", "10.0.0.0/8"])).toBe(true);
    expect(ipMatchesCidrs("192.168.1.5", ["192.168.0.0/16", "10.0.0.0/8"])).toBe(true);
    expect(ipMatchesCidrs("8.8.8.8", ["192.168.0.0/16", "10.0.0.0/8"])).toBe(false);
  });

  it("bare IP (no /N) = exact equality", () => {
    expect(ipMatchesCidrs("1.2.3.4", ["1.2.3.4"])).toBe(true);
    expect(ipMatchesCidrs("1.2.3.5", ["1.2.3.4"])).toBe(false);
  });

  it("strips IPv6-mapped IPv4 prefix from request IP", () => {
    expect(ipMatchesCidrs("::ffff:1.2.3.4", ["1.2.3.0/24"])).toBe(true);
  });
});

describe("ipMatchesCidrs — malformed entries", () => {
  it("malformed CIDR is silently skipped (other entries still apply)", () => {
    expect(ipMatchesCidrs("1.2.3.4", ["not-a-cidr", "1.2.3.0/24"])).toBe(true);
  });

  it("a list of ONLY malformed entries doesn't match anything", () => {
    expect(ipMatchesCidrs("1.2.3.4", ["totally bogus", "9999.9999.9999.9999/24"])).toBe(false);
  });

  it("prefix out of range (>32 for IPv4) doesn't match", () => {
    expect(ipMatchesCidrs("1.2.3.4", ["1.2.3.4/64"])).toBe(false);
  });

  it("negative prefix doesn't match", () => {
    expect(ipMatchesCidrs("1.2.3.4", ["1.2.3.4/-1"])).toBe(false);
  });

  it("empty-string entries are skipped", () => {
    expect(ipMatchesCidrs("1.2.3.4", ["", "1.2.3.4/32"])).toBe(true);
    expect(ipMatchesCidrs("1.2.3.4", [""])).toBe(false);
  });
});

describe("ipMatchesCidrs — IPv6 fallback", () => {
  it("matches IPv6 loopback exactly", () => {
    expect(ipMatchesCidrs("::1", ["::1/128"])).toBe(true);
    expect(ipMatchesCidrs("::1", ["::1"])).toBe(true);
  });

  it("doesn't false-positive across distinct IPv6 addresses", () => {
    expect(ipMatchesCidrs("fe80::1", ["::1/128"])).toBe(false);
  });

  it("case-insensitive for IPv6 base", () => {
    expect(ipMatchesCidrs("FE80::1", ["fe80::1/128"])).toBe(true);
  });
});
