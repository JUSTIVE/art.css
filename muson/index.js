// Web Audio API를 사용한 신디사이저 구현
let audioContext;
let currentOscillator = null;
let currentGainNode = null;
let volumeLevel = 1; // 0: Lo, 1: Med, 2: High
const volumeLevels = [0.15, 0.3, 0.6]; // Lo, Med, High 볼륨 값
let octaveLevel = 1; // 0: Off (낮은 옥타브), 1: Organ (기본), 2: Organ & Synth (높은 옥타브)
const octaveMultipliers = [0.5, 1.0, 2.0]; // 옥타브 배율
let pitchBend = 0; // -1.0 ~ 1.0 (피치 벤드)

const noteChips = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"];

// 각 건반에 해당하는 주파수 (Hz)
const keyFrequencies = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  698.46, // F5
  783.99, // G5
  880.0, // A5
  987.77, // B5
  1046.5, // C6
  1174.66, // D6
  1318.51, // E6
];

// 음표 이름
const noteNames = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"];

// 피치 벤드 계산 (±2 반음)
function getPitchBendMultiplier() {
  // pitchBend: -1.0 ~ 1.0 -> ±2 semitones
  //
  console.log(pitchBend);
  const semitones = pitchBend * 8;
  return Math.pow(2, semitones / 12);
}

// 소리 재생 함수
function playNote(frequency, noteName) {
  // 이미 재생 중인 소리가 있으면 중지
  if (currentOscillator) {
    stopNote();
  }

  // AudioContext 초기화 (첫 사용자 인터랙션 시)
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Oscillator (음파 생성기) 생성
  currentOscillator = audioContext.createOscillator();
  currentGainNode = audioContext.createGain();

  // Oscillator 설정
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3000; // 2k~4k 사이 조절
  filter.Q.value = 0.7;
  currentOscillator.type = "square"; // 사인파 (부드러운 소리)
  const adjustedFrequency =
    frequency * octaveMultipliers[octaveLevel] * getPitchBendMultiplier();
  currentOscillator.frequency.setValueAtTime(
    adjustedFrequency,
    audioContext.currentTime,
  );

  // 볼륨 설정 (페이드 인 효과)
  const targetVolume = volumeLevels[volumeLevel];
  currentGainNode.gain.setValueAtTime(0, audioContext.currentTime);
  currentGainNode.gain.linearRampToValueAtTime(
    targetVolume,
    audioContext.currentTime + 0.05,
  );

  // 연결: Oscillator -> Filter -> Gain -> Destination (스피커)
  currentOscillator.connect(filter);
  filter.connect(currentGainNode);
  currentGainNode.connect(audioContext.destination);

  // 재생 시작
  currentOscillator.start(audioContext.currentTime);

  const octaveModes = ["Off (Low)", "Organ (Normal)", "Organ & Synth (High)"];
  console.log(
    `Playing note: ${noteName} (${adjustedFrequency.toFixed(2)} Hz) | Volume: ${["Lo", "Med", "High"][volumeLevel]} | Octave: ${octaveModes[octaveLevel]} | Pitch Bend: ${pitchBend.toFixed(2)}`,
  );
}

// 피치 벤드 업데이트 (재생 중인 음에 실시간 적용)
function updatePitchBend(newPitchBend) {
  pitchBend = newPitchBend;

  // 현재 재생 중인 음이 있으면 주파수 업데이트
  if (currentOscillator && audioContext) {
    const baseFreq = currentOscillator.frequency.value;
    const newFreq = baseFreq * getPitchBendMultiplier();
    currentOscillator.frequency.setValueAtTime(
      newFreq,
      audioContext.currentTime,
    );
  }
}

// 소리 중지 함수
function stopNote() {
  if (currentOscillator && currentGainNode && audioContext) {
    const oscillatorToStop = currentOscillator;
    const gainNodeToStop = currentGainNode;

    // 부드러운 페이드 아웃 효과
    const fadeOutTime = 0.3;
    const currentTime = audioContext.currentTime;

    try {
      // 현재 볼륨 값 가져오기
      const currentGain = gainNodeToStop.gain.value;

      if (currentGain > 0.0001) {
        gainNodeToStop.gain.cancelScheduledValues(currentTime);
        gainNodeToStop.gain.setValueAtTime(currentGain, currentTime);
        gainNodeToStop.gain.exponentialRampToValueAtTime(
          0.0001,
          currentTime + fadeOutTime,
        );
      }

      // 페이드 아웃 후 완전히 중지
      oscillatorToStop.stop(currentTime + fadeOutTime);
    } catch (error) {
      console.error("Error stopping note:", error);
      try {
        oscillatorToStop.stop();
      } catch (e) {
        // 이미 멈춘 경우 무시
      }
    }

    // 즉시 null로 설정하여 새로운 소리 재생 가능하도록
    currentOscillator = null;
    currentGainNode = null;
  }
}

// DOM이 로드되면 이벤트 리스너 추가
document.addEventListener("DOMContentLoaded", () => {
  const keyContainer = document.querySelector(".key-container");
  const keys = keyContainer.querySelectorAll("div");

  keys.forEach((key, index) => {
    // 마우스 오버 시 소리 재생
    key.addEventListener("mouseenter", () => {
      playNote(keyFrequencies[index], noteNames[index]);
      key.style.transform = "translateY(2px)"; // 시각적 피드백
    });

    // 마우스 아웃 시 소리 중지
    key.addEventListener("mouseleave", () => {
      stopNote();
      key.style.transform = "translateY(0)"; // 원래 위치로
    });

    // 클릭 시에도 소리 재생
    key.addEventListener("click", () => {
      playNote(keyFrequencies[index], noteNames[index]);
      // 클릭 시에는 자동으로 멈추지 않도록 설정
      setTimeout(() => {
        stopNote();
      }, 500);
    });

    // 접근성을 위한 속성 추가
    key.setAttribute("role", "button");
    key.setAttribute("aria-label", `Play note ${noteNames[index]}`);
    key.setAttribute("tabindex", "0");

    // 키보드 지원
    key.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        playNote(keyFrequencies[index], noteNames[index]);
        setTimeout(() => {
          stopNote();
        }, 500);
      }
    });

    // 커서 스타일 변경
    key.style.cursor = "pointer";
  });

  // 볼륨 컨트롤 설정
  setupVolumeControl();

  // 피치 벤드 슬라이더 설정
  setupPitchBendControl();

  console.log("Muson Synth initialized! Hover over the keys to play notes.");
});

// 볼륨 컨트롤 설정 함수
function setupVolumeControl() {
  const switchWrapper = document.querySelector(".center .switch-wrapper");
  const switchButton = document.querySelector(".center .switch-button");

  if (!switchWrapper || !switchButton) {
    console.warn("Volume control elements not found");
    return;
  }

  // 볼륨 레벨 업데이트 함수
  function updateVolumeLevel(newLevel) {
    volumeLevel = newLevel;

    // 스위치 버튼 위치 업데이트 (3단계: 0%, 50%, 100%)
    const positions = [5, 28, 53];
    switchButton.style.left = `${positions[volumeLevel]}%`;

    const levelNames = ["Lo", "Med", "High"];
    console.log(`Volume set to: ${levelNames[volumeLevel]}`);
  }

  // 초기 위치 설정 (Med)
  updateVolumeLevel(1);

  // 스위치 클릭 이벤트
  switchWrapper.addEventListener("click", (e) => {
    // 다음 레벨로 순환 (Lo -> Med -> High -> Lo)
    const nextLevel = (volumeLevel + 1) % 3;
    updateVolumeLevel(nextLevel);
  });

  // 스타일 추가
  switchWrapper.style.cursor = "pointer";
  switchButton.style.cursor = "pointer";

  // 스위치 버튼에 트랜지션 추가
  switchButton.style.transition = "left 0.2s ease";
}

// 옥타브 컨트롤 설정 함수
// function setupOctaveControl() {
//   const sliderWrapper = document.querySelector(".right .slider-wrapper");
//   const slider = document.querySelector(".right .slider");

//   if (!sliderWrapper || !slider) {
//     console.warn("Octave control elements not found");
//     return;
//   }

//   // 스타일 추가
//   sliderWrapper.style.cursor = "pointer";
//   slider.style.cursor = "pointer";

//   // 슬라이더에 트랜지션 추가
//   slider.style.transition = "top 0.2s ease";
// }

// 피치 벤드 슬라이더 설정 함수
function setupPitchBendControl() {
  const volButtonContainer = document.querySelector(".vol-button-container");
  const volButton = document.querySelector(".vol-button");
  const volSlider = document.querySelector(".vol-slider");

  if (!volButtonContainer || !volButton || !volSlider) {
    console.warn("Pitch bend control elements not found");
    return;
  }

  let isDragging = false;

  // 슬라이더의 높이와 위치 정보
  function getSliderInfo() {
    const rect = volSlider.getBoundingClientRect();
    return {
      top: rect.top,
      height: rect.height,
    };
  }

  // 피치 벤드 업데이트 함수
  function updatePitchBendFromPosition(position) {
    const sliderInfo = getSliderInfo();
    let normalizedPosition = (position - sliderInfo.top) / sliderInfo.height;
    normalizedPosition = Math.max(0, Math.min(1, normalizedPosition));

    // 0 (High/+1) ~ 0.5 (중앙/0) ~ 1 (Low/-1)
    const newPitchBend = 1.0 - normalizedPosition * 2.0;

    // 버튼 위치 업데이트
    volButtonContainer.style.top = `calc(14px + ${normalizedPosition * 65}%)`;

    // 피치 벤드 적용
    updatePitchBend(newPitchBend);

    console.log(`Pitch Bend: ${newPitchBend.toFixed(2)}`);
  }

  // 초기 위치 설정 (중앙 = 피치 벤드 0)
  volButtonContainer.style.top = "50%";
  pitchBend = 0;

  // 마우스 다운 이벤트 (버튼)
  volButton.addEventListener("mousedown", (e) => {
    isDragging = true;
    e.preventDefault();
  });

  // 슬라이더 클릭 이벤트
  volSlider.addEventListener("mousedown", (e) => {
    isDragging = true;
    updatePitchBendFromPosition(e.clientY);
  });

  // 마우스 이동 이벤트 (document에 등록)
  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      updatePitchBendFromPosition(e.clientY);
    }
  });

  // 마우스 업 이벤트 (document에 등록) - 중앙으로 되돌아감
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      // 피치 벤드를 0으로 되돌리기 (스프링백)
    }
  });

  // 스타일 추가
  volButton.style.cursor = "grab";
  volSlider.style.cursor = "pointer";

  volButton.addEventListener("mousedown", () => {
    volButton.style.cursor = "grabbing";
  });

  document.addEventListener("mouseup", () => {
    volButton.style.cursor = "grab";
  });
}
