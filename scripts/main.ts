import {
  system,
  StartupEvent,
  CustomCommand,
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandOrigin,
  CustomCommandStatus,
  Entity,
  Player,
  Vector3,
  Dimension,
} from "@minecraft/server";
import MainMenu from "./Menu";

system.beforeEvents.startup.subscribe((init: StartupEvent) => {
  const menuCommand: CustomCommand = {
    name: "shh:menu",
    description: "打开菜单",
    permissionLevel: CommandPermissionLevel.Any,
  };
  init.customCommandRegistry.registerCommand(menuCommand, (origin: CustomCommandOrigin) => {
    const player = origin.sourceEntity;
    if (!player || !(player instanceof Player)) {
      return { status: CustomCommandStatus.Failure, message: "只有玩家可以执行此命令。" };
    }
    system.run(() =>
      new MainMenu({
        dimension: player.dimension,
        x: player.location.x,
        y: player.location.y,
        z: player.location.z,
      }).show(player)
    );
    return { status: CustomCommandStatus.Success };
  });

  const openmenuCommand: CustomCommand = {
    name: "shh:openmenu",
    description: "为指定玩家打开菜单",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    mandatoryParameters: [{ type: CustomCommandParamType.PlayerSelector, name: "targetPlayer" }],
  };
  init.customCommandRegistry.registerCommand(openmenuCommand, (origin: CustomCommandOrigin, targetPlayer) => {
    if (!targetPlayer || !Array.isArray(targetPlayer) || targetPlayer.length === 0) {
      return { status: CustomCommandStatus.Failure, message: "没有指定有效的玩家目标。" };
    }
    system.run(() => {
      for (const p of targetPlayer) {
        if (!(p instanceof Player)) continue;
        new MainMenu({
          dimension: p.dimension,
          x: p.location.x,
          y: p.location.y,
          z: p.location.z,
        }).show(p);
      }
    });
    return { status: CustomCommandStatus.Success };
  });

  const tpposCommand: CustomCommand = {
    name: "shh:tppos",
    description: "将你传送到指定坐标。",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.Location, name: "destination" }],
  };
  init.customCommandRegistry.registerCommand(tpposCommand, (origin: CustomCommandOrigin, destination: Vector3) => {
    const player = origin.sourceEntity;
    if (!player || !(player instanceof Player)) {
      return { status: CustomCommandStatus.Failure, message: "只有玩家可以执行此命令。" };
    }
    const { x, y, z } = destination;
    system.run(() => {
      try {
        player.teleport({ x, y, z });
        player.sendMessage(`已传送到 ${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`);
      } catch (e) {
        player.sendMessage(`传送失败: ${e}`);
      }
    });
    return { status: CustomCommandStatus.Success };
  });

  const tptargetCommand: CustomCommand = {
    name: "shh:tpentity",
    description: "将你传送到指定实体的位置。",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.EntitySelector, name: "targetEntity" }],
  };
  init.customCommandRegistry.registerCommand(tptargetCommand, (origin: CustomCommandOrigin, targetEntity: Entity) => {
    const player = origin.sourceEntity;
    if (!player || !(player instanceof Player)) {
      return { status: CustomCommandStatus.Failure, message: "只有玩家可以执行此命令。" };
    }
    if (!targetEntity || !Array.isArray(targetEntity) || targetEntity.length === 0) {
      return { status: CustomCommandStatus.Failure, message: "没有指定有效的实体目标。" };
    } else if (targetEntity.length > 1) {
      return { status: CustomCommandStatus.Failure, message: "指定了多个实体目标，请只选择一个。" };
    }
    const target = targetEntity[0] as Entity;
    system.run(() => {
      try {
        target.dimension.runCommand(
          `tp "${player.name}" ${target.location.x} ${target.location.y} ${target.location.z}`
        );
        player.sendMessage(
          `已传送到 ${target.location.x.toFixed(2)}, ${target.location.y.toFixed(2)}, ${target.location.z.toFixed(2)}`
        );
      } catch (e) {
        player.sendMessage(`传送失败: ${e}`);
      }
    });
    return { status: CustomCommandStatus.Success };
  });
});
