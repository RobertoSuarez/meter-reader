import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  public currentUser = signal<User | null | undefined>(undefined);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    // Verificar sesión inicial de inmediato
    this.supabase.auth.getSession()
      .then(({ data }) => {
        this.currentUser.set(data.session?.user ?? null);
      })
      .catch((error) => {
        console.error('Error fetching session:', error);
        this.currentUser.set(null);
      });

    this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      this.currentUser.set(session?.user ?? null);
    });
  }
  
  // Auth
  async signInWithEmail(email: string) {
    return this.supabase.auth.signInWithOtp({ email });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  // Edge Function
  async extractMeterReading(imagePath: string): Promise<any> {
    const { data } = this.supabase.storage.from('meter_images').getPublicUrl(imagePath);
    
    // Obtener la sesión actual para pasar explícitamente el token JWT y evitar problemas de 401
    const { data: sessionData } = await this.supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    const { data: edgeData, error } = await this.supabase.functions.invoke('extract-meter', {
      body: { imageUrl: data.publicUrl },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    if (error) throw error;
    return edgeData;
  }
  
  // Storage
  async uploadMeterImage(file: File) {
    const ext = file.name.split('.').pop();
    const filePath = `${this.currentUser()?.id}/${Math.random()}.${ext}`;
    
    return this.supabase.storage
      .from('meter_images')
      .upload(filePath, file);
  }

  // Database Access
  async getMeters() {
    return this.supabase.from('meters').select('*').order('created_at', { ascending: false });
  }

  async createMeter(name: string, billingDay: number) {
    return this.supabase.from('meters').insert({ name, billing_day: billingDay, user_id: this.currentUser()?.id });
  }

  async getReadings(meterId: string) {
    return this.supabase
      .from('readings')
      .select('*')
      .eq('meter_id', meterId)
      .order('reading_date', { ascending: false });
  }

  async saveReading(meterId: string, kwValue: number, readingDate: string, imageUrl?: string) {
    return this.supabase
      .from('readings')
      .insert({ meter_id: meterId, kw_value: kwValue, reading_date: readingDate, image_url: imageUrl });
  }

  async getTariffRanges() {
     return this.supabase.from('tariff_ranges').select('*').order('range_min', { ascending: true });
  }

  async deleteReading(id: string) {
    return this.supabase.from('readings').delete().eq('id', id);
  }

  async updateReadingDate(id: string, newDate: string) {
    return this.supabase.from('readings').update({ reading_date: newDate }).eq('id', id);
  }
}
