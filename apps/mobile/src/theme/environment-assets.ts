import type {ImageSourcePropType} from 'react-native';
import type {SeasonId,WeatherId} from '../core/types';

export const seasonIconSource:Record<SeasonId,ImageSourcePropType>={
  spring:require('../../assets/environment/season_bloomtide.png'),
  summer:require('../../assets/environment/season_suncrest.png'),
  autumn:require('../../assets/environment/season_emberfall.png'),
  winter:require('../../assets/environment/season_frostwane.png'),
};

export const weatherIconSource:Record<WeatherId,ImageSourcePropType>={
  clear:require('../../assets/environment/weather_clear.png'),
  rain:require('../../assets/environment/weather_rain.png'),
  mist:require('../../assets/environment/weather_mist.png'),
  storm:require('../../assets/environment/weather_storm.png'),
  bloomwind:require('../../assets/environment/weather_bloomwind.png'),
  heatwave:require('../../assets/environment/weather_heatwave.png'),
  harvest_wind:require('../../assets/environment/weather_harvest_wind.png'),
  snow:require('../../assets/environment/weather_snow.png'),
  frost:require('../../assets/environment/weather_frost.png'),
};
