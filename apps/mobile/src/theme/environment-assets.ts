import type {ImageSourcePropType} from 'react-native';
import type {SeasonId,WeatherId} from '../core/types';

export const seasonIconSource:Record<SeasonId,ImageSourcePropType>={
  spring:require('../../assets/environment/season_bloomtide.webp'),
  summer:require('../../assets/environment/season_suncrest.webp'),
  autumn:require('../../assets/environment/season_emberfall.webp'),
  winter:require('../../assets/environment/season_frostwane.webp'),
};

export const weatherIconSource:Record<WeatherId,ImageSourcePropType>={
  clear:require('../../assets/environment/weather_clear.webp'),
  rain:require('../../assets/environment/weather_rain.webp'),
  mist:require('../../assets/environment/weather_mist.webp'),
  storm:require('../../assets/environment/weather_storm.webp'),
  bloomwind:require('../../assets/environment/weather_bloomwind.webp'),
  heatwave:require('../../assets/environment/weather_heatwave.webp'),
  harvest_wind:require('../../assets/environment/weather_harvest_wind.webp'),
  snow:require('../../assets/environment/weather_snow.webp'),
  frost:require('../../assets/environment/weather_frost.webp'),
};
