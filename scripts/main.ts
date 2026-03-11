import { system, StartupEvent, world, PlayerSpawnAfterEvent } from "@minecraft/server";

import {
  MenuCommand,
  OpenMenuCommand,
  TpPosCommand,
  TpEntityCommand,
  ClaimSetCommand,
  ClaimRemoveCommand,
  ClaimTrustCommand,
  ClaimUntrustCommand,
  ClaimListCommand,
  TpClaimCommand,
} from "./Command";
import { CommandRegistrar } from "./Registrar";
import { registerClaimListeners } from "./eventListener";

system.beforeEvents.startup.subscribe((init: StartupEvent) => {
  // 注册所有命令（基础命令 + 领地相关命令）
  new CommandRegistrar()
    .addCommand(MenuCommand)
    .addCommand(OpenMenuCommand)
    .addCommand(TpPosCommand)
    .addCommand(TpEntityCommand)
    .addCommand(ClaimSetCommand)
    .addCommand(ClaimRemoveCommand)
    .addCommand(ClaimTrustCommand)
    .addCommand(ClaimUntrustCommand)
    .addCommand(ClaimListCommand)
    .addCommand(TpClaimCommand)
    .registerAll(init);
});

// 注册事件监听器
registerClaimListeners();

// 初始化玩家 XUID
world.afterEvents.playerSpawn.subscribe((event: PlayerSpawnAfterEvent) => {
  if (!event.initialSpawn) return;
  const player = event.player;
  if (!player.getDynamicProperty("xuid")) {
    player.setDynamicProperty("xuid", player.id);
  }
});
