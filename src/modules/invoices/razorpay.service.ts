import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import {
  validateWebhookSignature,
  validatePaymentVerification,
} from 'razorpay/dist/utils/razorpay-utils';

export interface RazorpayOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

@Injectable()
export class RazorpayService {
  private client: Razorpay | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): Razorpay {
    if (this.client) return this.client;
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');
    if (!keyId || !keySecret) {
      throw new InternalServerErrorException(
        'Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET',
      );
    }
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return this.client;
  }

  /** amount in rupees — Razorpay's API takes paise. */
  async createOrder(amount: number, currency: string, receipt: string): Promise<RazorpayOrder> {
    const client = this.getClient();
    const order = await client.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
    });
    return {
      order_id: order.id,
      amount: Number(order.amount) / 100,
      currency: order.currency,
      key_id: this.configService.get<string>('razorpay.keyId')!,
    };
  }

  /** Per Razorpay's webhook signing spec — HMAC-SHA256 of the raw body with the webhook secret. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret');
    if (!webhookSecret) {
      throw new InternalServerErrorException('RAZORPAY_WEBHOOK_SECRET is not configured');
    }
    return validateWebhookSignature(rawBody, signature, webhookSecret);
  }

  /** Checkout-side signature (order_id|payment_id) — a fallback verification path to the webhook. */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const keySecret = this.configService.get<string>('razorpay.keySecret');
    if (!keySecret) throw new InternalServerErrorException('RAZORPAY_KEY_SECRET is not configured');
    return validatePaymentVerification(
      { payment_id: paymentId, order_id: orderId },
      signature,
      keySecret,
    );
  }
}
