const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

app.whenReady().then(async () => {
  const projectRoot = path.resolve(__dirname, "..");
  const sourcePath = path.join(projectRoot, "build", "app-icon.svg");
  const outputPath = path.join(projectRoot, "build", "app-icon.png");
  const iconWindow = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: {
      offscreen: true
    }
  });

  await iconWindow.loadFile(sourcePath);
  const image = await iconWindow.webContents.capturePage();
  fs.writeFileSync(outputPath, image.resize({ width: 512, height: 512 }).toPNG());
  iconWindow.destroy();
  app.quit();
});
