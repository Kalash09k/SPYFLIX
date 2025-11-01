import { Module } from "@nestjs/common";
import { WhatsAppService } from "./whatsapp.service";
import { NotificationsService } from "./notifications.service";

@Module({
    providers: [WhatsAppService, NotificationsService],
    exports: [NotificationsService],
})

export class NotificationsModule {}