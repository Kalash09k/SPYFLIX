import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // ⚠️ pour le développement — à sécuriser plus tard
  },
})
export class NotificationsGateway {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  // 🔥 Méthode pour émettre un événement vers le frontend
  sendNotificationToUser(phone: string, message: string) {
    this.logger.log(`Envoi notification à ${phone}: ${message}`);
    this.server.emit(`notification:${phone}`, { message });
  }

  // (optionnel) message test
  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any) {
    this.logger.log('Ping reçu:', data);
    return { message: 'pong' };
  }
}
