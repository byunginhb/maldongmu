import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { PersonasModule } from "../personas/personas.module";

@Module({ imports: [PersonasModule], controllers: [AdminController] })
export class AdminModule {}
