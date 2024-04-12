// todo https://github.com/electron/electron/issues/7476
// require("update-electron-app")();
const fs = require("fs");
const path = require("path");

const data = fs.readFileSync(__dirname + '/package.json', 'utf8');
let pkg = JSON.parse(data);
const {menubar} = require("menubar");
const Analytics = require('electron-google-analytics4').default;
const analytics = new Analytics('G-33HV8DVL5W', 'RJD5WsBDR2yQrQ_9R0OyBA');
analytics.setParams({"engagement_time_msec": 1});

const {
  app, nativeImage, Tray, Menu, globalShortcut, shell,
} = require("electron");
const contextMenu = require("electron-context-menu");

const image = nativeImage.createFromPath(path.join(__dirname, `images/menubar/icon.png`));

app.on("ready", () => {
  analytics.event('page_ready');
  const tray = new Tray(image);

  const mb = menubar({
    browserWindow: {
      icon: image,
      transparent: true,
      webPreferences: {
        webviewTag: true,
        // nativeWindowOpen: true,
      },
      width: 450,
      height: 550,
    }, tray, showOnAllWorkspaces: true, preloadWindow: true, showDockIcon: false, icon: image,
  });

  mb.on("ready", () => {
    const {window} = mb;

    if (process.platform !== "darwin") {
      window.setSkipTaskbar(true);
    } else {
      app.dock.hide();
    }

    const contextMenuTemplate = [{
      label: 'Always On Top', type: 'checkbox', checked: false,
      click: (menuItem, browserWindow, event) => {
        let newChecked = menuItem.checked;
        contextMenuTemplate[0].checked = newChecked;
        let mainWindow = mb.window;
        mainWindow.setAlwaysOnTop(newChecked);
        mb.tray.closeContextMenu();
      }
    }, {
      label: "Quit", accelerator: "Command+Q", click: () => {
        app.quit();
      },
    }, {
      label: "Reload", accelerator: "Command+R", click: () => {
        window.reload();
      },
    }, {
      label: "Open in Browser", click: () => {
        shell.openExternal("https://www.icloud.com");
      },
    }, {
      type: "separator",
    }, {
      label: "Home Page", click: () => {
        shell.openExternal(`https://logspot.hocgin.top/${pkg.name}`);
      },
    }, {
      label: "More", click: () => {
        shell.openExternal("https://logspot.hocgin.top/");
      },
    }];

    tray.on("right-click", () => {
      mb.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate));
    });

    tray.on("click", (e) => {
      //check if ctrl or meta key is pressed while clicking
      e.ctrlKey || e.metaKey ? mb.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate)) : null;
      analytics.event('page_view');
    });
    const menu = new Menu();

    globalShortcut.register("CommandOrControl+Shift+g", () => {
      if (window.isVisible()) {
        mb.hideWindow();
      } else {
        mb.showWindow();
        if (process.platform === "darwin") {
          mb.app.show();
        }
        mb.app.focus();
      }
    });

    Menu.setApplicationMenu(menu);

    // open devtools
    // window.webContents.openDevTools();

    console.log("Menubar app is ready.");
  });

  app.on("web-contents-created", (e, contents) => {
    if (contents.getType() === "webview") {
      // open link with external browser in webview
      contents.on("new-window", (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
      });
      // set context menu in webview
      contextMenu({
        window: contents,
      });

      // we can't set the native app menu with "menubar" so need to manually register these events
      // register cmd+c/cmd+v events
      contents.on("before-input-event", (event, input) => {
        const {control, meta, key} = input;
        if (!control && !meta) return;
        if (key === "c") contents.copy();
        if (key === "v") contents.paste();
        if (key === "a") contents.selectAll();
        if (key === "z") contents.undo();
        if (key === "y") contents.redo();
        if (key === "q") app.quit();
        if (key === "r") contents.reload();
      });
    }
  });

  if (process.platform === "darwin") {
    // restore focus to previous app on hiding
    mb.on("after-hide", () => {
      mb.app.hide();
    });
  }

  // open links in new window
  // app.on("web-contents-created", (event, contents) => {
  //   contents.on("will-navigate", (event, navigationUrl) => {
  //     event.preventDefault();
  //     shell.openExternal(navigationUrl);
  //   });
  // });

  // prevent background flickering
  app.commandLine.appendSwitch("disable-backgrounding-occluded-windows", "true");
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
