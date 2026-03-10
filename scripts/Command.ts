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
} from "@minecraft/server";
import MainMenu from "./Menu";

export abstract class BaseCommand {
  abstract readonly cmd: CustomCommand;

  abstract register(init: StartupEvent): void;

  protected static getPlayer(origin: CustomCommandOrigin): Player | null {
    const source = origin.sourceEntity;
    return source instanceof Player ? source : null;
  }

  protected success(message?: string) {
    return message ? { status: CustomCommandStatus.Success, message } : { status: CustomCommandStatus.Success };
  }

  protected failure(message: string) {
    return { status: CustomCommandStatus.Failure, message };
  }
}

export class MenuCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:menu",
    description: "打开菜单",
    permissionLevel: CommandPermissionLevel.Any,
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin) => {
      const player = BaseCommand.getPlayer(origin);
      if (!player) {
        return this.failure("只有玩家可以执行此命令。");
      }
      system.run(() =>
        new MainMenu({
          dimension: player.dimension,
          x: player.location.x,
          y: player.location.y,
          z: player.location.z,
        }).show(player)
      );
      return this.success();
    });
  }
}

export class OpenMenuCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:openmenu",
    description: "为指定玩家打开菜单",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    mandatoryParameters: [{ type: CustomCommandParamType.PlayerSelector, name: "targetPlayer" }],
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin, targetPlayer) => {
      if (!targetPlayer || !Array.isArray(targetPlayer) || targetPlayer.length === 0) {
        return this.failure("没有指定有效的玩家目标。");
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
      return this.success();
    });
  }
}

export class TpPosCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:tppos",
    description: "将你传送到指定坐标。",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.Location, name: "destination" }],
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin, destination: Vector3) => {
      const player = BaseCommand.getPlayer(origin);
      if (!player) {
        return this.failure("只有玩家可以执行此命令。");
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
      return this.success();
    });
  }
}

export class TpEntityCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:tpentity",
    description: "将你传送到指定实体。",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.EntitySelector, name: "targetEntity" }],
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin, targetEntity: Entity) => {
      const player = origin.sourceEntity;
      if (!player || !(player instanceof Player)) {
        return this.failure("只有玩家可以执行此命令。");
      }
      if (!targetEntity || !Array.isArray(targetEntity) || targetEntity.length === 0) {
        return this.failure("没有指定有效的实体目标。");
      } else if (targetEntity.length > 1) {
        return this.failure("指定了多个实体目标，请只选择一个。");
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
      return this.success();
    });
  }
}
