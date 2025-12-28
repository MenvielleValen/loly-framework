import fs from "fs";
import os from "os";
import path from "path";

export function setupTempProject(fixtureName = "test-project") {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "loly-test-")
  );
  const fixtureRoot = path.resolve(
    __dirname,
    "fixtures",
    fixtureName
  );
  fs.cpSync(fixtureRoot, projectRoot, { recursive: true });

  const cleanup = () => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  };

  return { projectRoot, cleanup };
}

