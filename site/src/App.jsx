import { lazy, Suspense } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Features from './components/Features.jsx';
import AutoConnect from './components/AutoConnect.jsx';
import Quality from './components/Quality.jsx';
import Ads from './components/Ads.jsx';
import Install from './components/Install.jsx';
import Api from './components/Api.jsx';
import Encoder from './components/Encoder.jsx';
import Footer from './components/Footer.jsx';

// Плеер и hls.js (~450 КБ) вынесены в отдельный фрагмент: он подгружается после первой отрисовки и не задерживает первый экран
const Demo = lazy(() => import('./components/Demo.jsx'));

function DemoPlaceholder() {
  return (
    <div className="wrap demo">
      <div className="demo-frame"><div className="demo-skeleton" role="status" aria-label="Загрузка плеера" /></div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <section id="demo" className="demo-section" aria-label="Демо">
          <Suspense fallback={<DemoPlaceholder />}>
            <Demo />
          </Suspense>
        </section>
        <Features />
        <AutoConnect />
        <Quality />
        <Ads />
        <Install />
        <Api />
        <Encoder />
      </main>
      <Footer />
    </>
  );
}
