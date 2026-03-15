import { supabase } from '../config/database';
import { DECLINE_INACTIVITY_DAYS, DECLINE_HEALTH_REDUCTION_PER_DAY } from '../utils/points';

export async function runCityDeclineJob(): Promise<void> {
  try {
    const inactivityThreshold = new Date(
      Date.now() - DECLINE_INACTIVITY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: cities } = await supabase
      .from('cities')
      .select('*')
      .or(`last_workout_at.lt.${inactivityThreshold},last_workout_at.is.null`)
      .eq('decline_active', false);

    if (cities && cities.length > 0) {
      const cityIds = cities.map(c => c.id);
      await supabase.from('cities').update({ decline_active: true }).in('id', cityIds);
    }

    const { data: decliningCities } = await supabase
      .from('cities').select('id').eq('decline_active', true);

    if (!decliningCities) return;

    for (const city of decliningCities) {
      const { data: buildings } = await supabase
        .from('buildings').select('id, health, status')
        .eq('city_id', city.id).eq('status', 'completed');

      if (!buildings) continue;
      for (const building of buildings) {
        const newHealth = Math.max(0, building.health - DECLINE_HEALTH_REDUCTION_PER_DAY);
        await supabase.from('buildings')
          .update({ health: newHealth, status: newHealth <= 0 ? 'damaged' : 'completed' })
          .eq('id', building.id);
      }
    }
  } catch (err) {
    console.error('[CityDecline] Job error:', err);
  }
}

export async function scheduleCityDeclineJob(): Promise<void> {
  await runCityDeclineJob();
  setInterval(runCityDeclineJob, 24 * 60 * 60 * 1000);
  console.log('City decline job scheduled');
}
