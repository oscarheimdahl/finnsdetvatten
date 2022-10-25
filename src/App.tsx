import { useEffect, useMemo, useState } from 'react';

import { connect } from '@planetscale/database';

const config = {
  host: import.meta.env.VITE_HOST,
  username: import.meta.env.VITE_USERNAME,
  password: import.meta.env.VITE_PASSWORD,
};
const db = connect(config);

interface WaterRow {
  id: 1;
  last_water: number;
}

const WATER_DEADLINE_SECONDS = 60 * 60 * 24 * 14; // Two weeks
const FILLUP_DURATION = 2;

const useTicker = (action: () => void, shouldUpdate: boolean, interval: number) => {
  useEffect(() => {
    const ticker = setInterval(() => {
      if (shouldUpdate) action();
    }, interval);
    return () => clearInterval(ticker);
  }, [shouldUpdate]);
};

function App() {
  const [lastWater, setLastWater] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [transitioning, setTransitioning] = useState(false);

  const fetchLastWater = async () => {
    const results = await db.execute('select * from finnsdetvatten', [1]);
    const last_water = (results.rows[0] as WaterRow).last_water;
    setLastWater(last_water);
  };

  const updateLastWater = async () => {
    const newDate = Date.now() + FILLUP_DURATION * 1000;
    const results = await db.execute(`update finnsdetvatten SET last_water = ${newDate} WHERE id = 1;`, [1]);
    if (results.rowsAffected === 1) setLastWater(newDate);

    setTransitioning(true);
    setTimeout(() => setTransitioning(false), FILLUP_DURATION * 1000);
  };

  useEffect(() => {
    fetchLastWater();
  }, []);

  useTicker(
    () => {
      setNow(Date.now());
    },
    !transitioning,
    1000
  );

  if (!lastWater) return <></>;

  const lastWaterSeconds = (now - lastWater) / 1000;
  const percent = (lastWaterSeconds / WATER_DEADLINE_SECONDS) * 100;
  const days = Math.max(Math.floor(lastWaterSeconds / 60 / 60 / 24), 0);
  return (
    <div className='App'>
      <h2>
        {days} dagar sen någon vattnade. {days ? '' : '⭐️'}
      </h2>
      <WaterBar percent={percent} transitioning={transitioning}></WaterBar>
      <button onClick={updateLastWater}>Jag har vattnat</button>
    </div>
  );
}

interface WaterBarProps {
  percent: number;
  transitioning: boolean;
}

const WaterBar = ({ percent, transitioning }: WaterBarProps) => {
  const p = Math.min(Math.max(percent, 5), 102);
  const speed = 1000;

  return (
    <div className='water-bar'>
      <p>Vattna!</p>
      <div
        style={{
          transform: `translateY(${p}%)`,
          transitionDuration: `${transitioning ? FILLUP_DURATION * 1000 : speed}ms`,
        }}
        className='fullness'
      >
        <svg className='wave' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'>
          <path
            fill='#3e63dc'
            d='M0,288L48,245.3C96,203,192,117,288,122.7C384,128,480,224,576,266.7C672,309,768,299,864,261.3C960,224,1056,160,1152,128C1248,96,1344,96,1392,96L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'
          />
        </svg>
      </div>
    </div>
  );
};

export default App;
