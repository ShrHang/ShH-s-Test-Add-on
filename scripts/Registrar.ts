import { StartupEvent } from "@minecraft/server";
import { BaseCommand } from "./Command";

type CommandCtor<T extends BaseCommand = BaseCommand> = new () => T;

export class CommandRegistrar {
  protected commands: BaseCommand[] = [];

  public addCommand(CommandClass: CommandCtor): this {
    this.commands.push(new CommandClass());
    return this;
  }

  public addCommandInstance(command: BaseCommand): this {
    this.commands.push(command);
    return this;
  }

  public registerAll(init: StartupEvent) {
    this.commands.forEach((cmd) => cmd.register(init));
  }
}
