import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

/**
 * App-wide event orchestrator. Wraps @nestjs/event-emitter once so any
 * module can inject EventEmitter2 / use @OnEvent without re-registering it.
 * Add new domain events under src/shared/events/event-names.ts.
 */
@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  exports: [EventEmitterModule],
})
export class EventsModule {}

