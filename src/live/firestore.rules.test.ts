// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { doc, getDoc, setDoc } from "firebase/firestore";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "";
const describeWithEmulator = emulatorHost ? describe : describe.skip;

describeWithEmulator("Firestore rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, rawPort] = emulatorHost.split(":");
    testEnv = await initializeTestEnvironment({
      projectId: "demo-asset-discovery",
      firestore: {
        host: host || "127.0.0.1",
        port: Number(rawPort || "8080"),
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      },
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  async function seedRunDocuments(): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "runs/run-1"), {
        id: "run-1",
        owner_uid: "uid-owner",
        owner_email: "analyst@zerofox.com",
        mode: "manual",
        status: "awaiting_review",
      });
      await setDoc(doc(db, "runs/run-1/assets/asset-1"), {
        asset_id: "asset-1",
        identifier: "example.com",
      });
      await setDoc(doc(db, "runs/run-1/analysis/judge_summary"), {
        evaluation_count: 1,
        accepted_count: 1,
        discarded_count: 0,
      });
    });
  }

  it("allows the owner to read the run and nested data", async () => {
    await seedRunDocuments();

    const ownerDB = testEnv
      .authenticatedContext("uid-owner", {
        email: "analyst@zerofox.com",
        email_verified: true,
      })
      .firestore();

    await assertSucceeds(getDoc(doc(ownerDB, "runs/run-1")));
    await assertSucceeds(getDoc(doc(ownerDB, "runs/run-1/assets/asset-1")));
    await assertSucceeds(
      getDoc(doc(ownerDB, "runs/run-1/analysis/judge_summary")),
    );
  });

  it("denies reads to a different user", async () => {
    await seedRunDocuments();

    const otherDB = testEnv
      .authenticatedContext("uid-other", {
        email: "analyst@zerofox.com",
        email_verified: true,
      })
      .firestore();

    await assertFails(getDoc(doc(otherDB, "runs/run-1")));
    await assertFails(getDoc(doc(otherDB, "runs/run-1/assets/asset-1")));
    await assertFails(
      getDoc(doc(otherDB, "runs/run-1/analysis/judge_summary")),
    );
  });

  it("denies reads to a non-allowlisted email even when the uid matches", async () => {
    await seedRunDocuments();

    const blockedDB = testEnv
      .authenticatedContext("uid-owner", {
        email: "person@example.com",
        email_verified: true,
      })
      .firestore();

    await assertFails(getDoc(doc(blockedDB, "runs/run-1")));
  });

  it("denies all client writes", async () => {
    await seedRunDocuments();

    const ownerDB = testEnv
      .authenticatedContext("uid-owner", {
        email: "analyst@zerofox.com",
        email_verified: true,
      })
      .firestore();

    await assertFails(
      setDoc(doc(ownerDB, "runs/run-1"), { owner_uid: "uid-owner" }),
    );
    await assertFails(
      setDoc(doc(ownerDB, "runs/run-1/assets/asset-2"), {
        identifier: "blocked.example.com",
      }),
    );
  });
});
