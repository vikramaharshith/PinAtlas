import {Component} from 'react';
import {createRoot} from 'react-dom/client';
import MicroSlats from './components/MicroSlats';

// Keep the decorative renderer independent of catalog and comparison routing.
class BackgroundBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){console.warn('Animated background unavailable; using the static background.',error);}
  render(){return this.state.failed?null:this.props.children;}
}
const host=document.querySelector('#page-background');
if(host)createRoot(host).render(
  <BackgroundBoundary>
    <MicroSlats
      preset="signal"
      color="#030577"
      glintColor="#06B6D4"
      backgroundColor="#000000"
      slatWidth={10}
      slatHeight={25}
      gap={1}
      roundness={0.75}
      interactive
      cursorStrength={0.5}
      cursorSize={35}
      swirl={0}
      trail={1}
      lean={0}
      intro
      scale={0.3}
      speed={0.4}
      direction={180}
      chop={1.15}
      glint={0.25}
      contrast={1.8}
      perspective={0}
      fog={0}
      introDuration={1.8}
    />
  </BackgroundBoundary>
);
