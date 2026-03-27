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

const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "";
const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? "";
const describeWithEmulator =
  firestoreEmulatorHost && storageEmulatorHost ? describe : describe.skip;

describeWithEmulator("Storage rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const [firestoreHost, firestorePort] = firestoreEmulatorHost.split(":");
    const [storageHost, storagePort] = storageEmulatorHost.split(":");
    testEnv = await initializeTestEnvironment({
      projectId: "demo-asset-discovery",
      firestore: {
        host: firestoreHost || "127.0.0.1",
        port: Number(firestorePort || "8080"),
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      },
      storage: {
        host: storageHost || "127.0.0.1",
        port: Number(storagePort || "9199"),
        rules: readFileSync(resolve(process.cwd(), "storage.rules"), "utf8"),
      },
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  async function seedStorageArtifacts(): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc("runs/run-1").set({
        id: "run-1",
        owner_uid: "uid-owner",
        owner_email: "analyst@zerofox.com",
      });

      const storage = context.storage();
      await storage.ref("runs/run-1/results.json").putString('{"ok":true}');
    });
  }

  it("allows the owner to download a run artifact", async () => {
    await seedStorageArtifacts();

    const ownerStorage = testEnv
      .authenticatedContext("uid-owner", {
        email: "analyst@zerofox.com",
        email_verified: true,
      })
      .storage();

    await assertSucceeds(
      ownerStorage.ref("runs/run-1/results.json").getMetadata(),
    );
  });

  it("allows artifact downloads to another allowlisted user", async () => {
    await seedStorageArtifacts();

    const otherStorage = testEnv
      .authenticatedContext("uid-other", {
        email: "analyst@zerofox.com",
        email_verified: true,
      })
      .storage();

    await assertSucceeds(
      otherStorage.ref("runs/run-1/results.json").getMetadata(),
    );
  });

  it("denies artifact downloads to a non-allowlisted email", async () => {
    await seedStorageArtifacts();

    const blockedStorage = testEnv
      .authenticatedContext("uid-owner", {
        email: "person@example.com",
        email_verified: true,
      })
      .storage();

    await assertFails(
      blockedStorage.ref("runs/run-1/results.json").getMetadata(),
    );
  });

  it("denies all client writes", async () => {
    await seedStorageArtifacts();

    const ownerStorage = testEnv
      .authenticatedContext("uid-owner", {
        email: "analyst@zerofox.com",
        email_verified: true,
      })
      .storage();

    await assertFails(
      ownerStorage
        .ref("runs/run-1/results.csv")
        .putString("blocked")
        .then(() => undefined),
    );
  });
});
