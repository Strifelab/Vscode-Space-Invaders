import * as vscode from "vscode";
import { GameViewProvider } from "./GameViewProvider";

export function activate(context: vscode.ExtensionContext) {
  const provider = new GameViewProvider(
    context.extensionUri,
    context.globalState
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GameViewProvider.viewType,
      provider
    )
  );
}

export function deactivate() {}
