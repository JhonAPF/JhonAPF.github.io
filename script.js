document.addEventListener("DOMContentLoaded", () => {
    const map = L.map('map').setView([4.65, -74.1], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let impactMarker = null;
    let craterLayer = null;
    let circleLayer = null;
    let earthquakeWave = null;
    let shockwave = null;
    let asteroidLaunched = false;

    const launchButton = document.getElementById('launch');
    const resetButton = document.getElementById('reset');

    map.on('click', (e) => {
        if (asteroidLaunched) return;
        if (impactMarker) map.removeLayer(impactMarker);
        impactMarker = L.marker(e.latlng).addTo(map);
    });

    function calculateImpact() {
        const diameter = parseFloat(document.getElementById("diameter").value);
        const velocity = parseFloat(document.getElementById("speed").value) * 1000;
        const angle = parseFloat(document.getElementById("angle").value) * Math.PI / 180;
        const material = document.getElementById("material").value;
        const targetDensity = parseFloat(document.getElementById("target-density").value);
        const distance = parseFloat(document.getElementById("distance").value) * 1000;

        const densities = { iron: 7870, rock: 2700, ice: 917 };
        const density = densities[material] || 2700;

        const radius = diameter / 2;
        const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
        const mass = volume * density;

        const energy_joules = 0.5 * mass * Math.pow(velocity, 2);
        const energy_megatons = energy_joules / (4.184e15);

        const crater_final = 1.25 * (1.161 * Math.pow((density / targetDensity), 0.22) *
            Math.pow(diameter, 0.78) * Math.pow(velocity, 0.44) * Math.pow(9.81, -0.22) *
            Math.pow(Math.sin(angle), 1 / 3));
        const crater_depth = 0.75 * (0.3 * crater_final);

        const quake_magnitude = 0.67 * Math.log10(energy_joules) - 5.87;
        const overpressure = (75000 / (4 * distance)) * (1 + 3 * Math.pow(290 / distance, 1.3));
        const wind_speed = 0.28 * Math.sqrt(overpressure);
        const sound_intensity = 20 * Math.log10(overpressure / (20 * Math.pow(10, -6)));
        const seismic_wave_radius = Math.pow(energy_joules, 0.42) / 1000;

        return {
            crater_final: crater_final / 1000,
            crater_depth: crater_depth / 1000,
            energy_megatons,
            quake_magnitude,
            overpressure,
            wind_speed,
            sound_intensity,
            seismic_wave_radius
        };
    }

    function simulateImpact(lat, lng) {
        const impactData = calculateImpact();
        const craterRadiusKm = impactData.crater_final;
        const craterRadiusDeg = craterRadiusKm / 111.32;
        const adjustedRadiusDeg = craterRadiusDeg * 0.5;

        const bounds = [
            [lat - adjustedRadiusDeg, lng - adjustedRadiusDeg],
            [lat + adjustedRadiusDeg, lng + adjustedRadiusDeg]
        ];

        const flash = L.circleMarker([lat, lng], {
            color: 'yellow',
            fillColor: 'white',
            fillOpacity: 0,
            radius: 10,
            className: 'flash-effect'
        }).addTo(map);

        const maxFlashSize = craterRadiusKm * 1000 * Math.pow(2, 18 - map.getZoom());
        let flashProgress = 0;
        const flashSteps = 100;
        const flashDuration = 2300;
        const flashIntervalTime = flashDuration / flashSteps;

        const flashAnimation = setInterval(() => {
            flashProgress++;
            const scale = flashProgress / flashSteps;
            flash.setRadius(10 + (maxFlashSize - 10) * scale);
            flash.setStyle({ fillOpacity: Math.sin(scale * Math.PI) });

            if (flashProgress >= flashSteps) {
                clearInterval(flashAnimation);
                map.removeLayer(flash);

                setTimeout(() => {
                    startCraterAnimation(lat, lng, impactData, bounds, adjustedRadiusDeg);
                    displayImpactResults(impactData);
                }, 1);
            }
        }, flashIntervalTime);
    }

    function startCraterAnimation(lat, lng, impactData, bounds, adjustedRadiusDeg) {
        let progress = 0;
        const steps = 50;
        const duration = 2000;
        const intervalTime = duration / steps;

        circleLayer = L.circle([lat, lng], { color: '#ff0000', fillColor: '#ff6666', fillOpacity: 0.2, radius: 0 })
            .addTo(map).bindTooltip("🔥 CRATER", { permanent: true, direction: "center", opacity: 0.8 });

        craterLayer = L.imageOverlay('assets/crater.png', bounds, { opacity: 0, className: 'crater-image' }).addTo(map);

        setTimeout(() => {
            const animation = setInterval(() => {
                progress++;
                const scale = progress / steps;
                const currentRadius = (impactData.crater_final * 500) * scale;
                const currentBounds = [
                    [lat - (adjustedRadiusDeg * scale), lng - (adjustedRadiusDeg * scale)],
                    [lat + (adjustedRadiusDeg * scale), lng + (adjustedRadiusDeg * scale)]
                ];

                circleLayer.setRadius(currentRadius);
                craterLayer.setBounds(currentBounds);
                craterLayer.setOpacity(0.5 * Math.pow(scale, 2));

                if (progress >= steps) {
                    clearInterval(animation);
                    setTimeout(() => {
                        startSeismicWaveAnimation(lat, lng, impactData);
                        startShockwaveAnimation(lat, lng, impactData);
                    }, 100);
                }
            }, intervalTime);
        }, 100);
    }

    function startSeismicWaveAnimation(lat, lng, impactData) {
        earthquakeWave = L.circle([lat, lng], { color: 'brown', fillOpacity: 0.3, radius: 0 }).addTo(map);
        let waveProgress = 0;
        const steps = 50;
        const duration = 2000;
        const intervalTime = duration / steps;

        const waveAnimation = setInterval(() => {
            waveProgress++;
            earthquakeWave.setRadius(impactData.seismic_wave_radius * (waveProgress / steps));
            if (waveProgress >= steps) clearInterval(waveAnimation);
        }, intervalTime);
    }

    function startShockwaveAnimation(lat, lng, impactData) {
        shockwave = L.circle([lat, lng], { color: 'white', fillOpacity: 0.3, radius: 0 }).addTo(map);
        let shockwaveProgress = 0;
        const shockwaveSteps = 50;
        const shockwaveDuration = 4000;
        const shockwaveInterval = shockwaveDuration / shockwaveSteps;
        const k = 5;
        const shockwaveRadiusKm = k * Math.pow(impactData.energy_megatons, 1/3);
        const shockwaveRadiusMeters = shockwaveRadiusKm * 1000;
    
        const shockwaveAnimation = setInterval(() => {
            shockwaveProgress++;
            const currentRadius = shockwaveRadiusMeters * (shockwaveProgress / shockwaveSteps);
            shockwave.setRadius(currentRadius);
            if (shockwaveProgress >= shockwaveSteps) clearInterval(shockwaveAnimation);
        }, shockwaveInterval);
    }

    function displayImpactResults(impactData) {
        
        const shockwaveRadiusKm = 5 * Math.pow(impactData.energy_megatons, 1/3);  // Usando k = 5 como en tu fórmula
    
        document.getElementById("results").innerHTML = `
            <p><strong>Impact Results:</strong></p>
            <p>
                <span class="color-box" style="background-color: #ff6666;"></span>
                <b>Energy Released:</b> ${impactData.energy_megatons.toFixed(2)} Megatons of TNT
            </p>
            <p>
                <span class="color-box" style="background-color: #cc6600;"></span>
                <b>Crater Diameter:</b> ${impactData.crater_final.toFixed(2)} km
            </p>
            <p>
                <span class="color-box" style="background-color: #996633;"></span>
                <b>Crater Depth:</b> ${impactData.crater_depth.toFixed(2)} km
            </p>
            <p>
                <span class="color-box" style="background-color: brown;"></span>
                <b>Estimated Earthquake Magnitude:</b> ${impactData.quake_magnitude.toFixed(1)} 
                
            </p>
            <p>
                <span class="color-box" style="background-color: brown;"></span>
                <b>Radius Wave Earthquake:</b> ${impactData.seismic_wave_radius.toFixed(1)} <b>meters</b>
            </p>
            <p>
                <span class="color-box" style="background-color: white; border: 1px solid black;"></span>
                <b>Shockwave Radius:</b> ${shockwaveRadiusKm.toFixed(1)} km
            </p>
            <p>
                <span class="color-box" style="background-color: #ffcc00;"></span>
                <b>Overpressure:</b> ${impactData.overpressure.toFixed(2)} Pa
            </p>
            <p>
                <span class="color-box" style="background-color: #66ccff;"></span>
                <b>Wind Speed:</b> ${impactData.wind_speed.toFixed(2)} m/s
            </p>
            <p>
                <span class="color-box" style="background-color: #cccccc;"></span>
                <b>Sound Intensity:</b> ${impactData.sound_intensity.toFixed(2)} dB
            </p>`;
    }
    

    launchButton.addEventListener('click', () => {
        if (!impactMarker) {
            alert("Select a location on the map.");
            return;
        }
        asteroidLaunched = true;
        launchButton.disabled = true;
        const latLng = impactMarker.getLatLng();
        map.removeLayer(impactMarker);
        simulateImpact(latLng.lat, latLng.lng);
    });

    resetButton.addEventListener('click', () => {
        [craterLayer, impactMarker, circleLayer, earthquakeWave, shockwave].forEach(layer => {
            if (layer) map.removeLayer(layer);
        });
        craterLayer = impactMarker = circleLayer = earthquakeWave = shockwave = null;
        document.getElementById("results").innerHTML = "";
        asteroidLaunched = false;
        launchButton.disabled = false;
    });
});
