import { system, StartupEvent } from "@minecraft/server";
import { MenuCommand, OpenMenuCommand, TpPosCommand, TpEntityCommand } from "./Command";
import { CommandRegistrar } from "./Registrar";

system.beforeEvents.startup.subscribe((init: StartupEvent) => {
  new CommandRegistrar()
    .addCommand(MenuCommand)
    .addCommand(OpenMenuCommand)
    .addCommand(TpPosCommand)
    .addCommand(TpEntityCommand)
    .registerAll(init);
});
