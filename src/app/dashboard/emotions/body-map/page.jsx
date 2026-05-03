"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IoArrowBack } from 'react-icons/io5';
import styles from './EmotionsBodyMap.module.css';

export default function EmotionsBodyMap() {
    const router = useRouter();
    const [currentColor, setCurrentColor] = useState('#e57373');
    const [brushSize, setBrushSize] = useState(15);
    const [isErasing, setIsErasing] = useState(false);
    const [customEmotionLabel, setCustomEmotionLabel] = useState('');
    const [customColor, setCustomColor] = useState('#81c784');

    const canvasRefs = useRef({});
    const drawingDataRefs = useRef({});
    const isDrawing = useRef(false);
    const currentEmotion = useRef(null);

    const emotions = ['anxiety', 'sadness', 'anger', 'pain', 'happiness', 'custom'];

    const colors = [
        '#e57373', '#81c784', '#ffb74d', '#64b5f6', '#ba68c8', '#4db6ac',
        '#ff8a65', '#a1887f', '#90a4ae', '#aed581', '#f06292', '#9575cd'
    ];

    useEffect(() => {
        // Initialize canvases
        emotions.forEach(emotion => {
            const canvas = canvasRefs.current[emotion];
            if (canvas) {
                const ctx = canvas.getContext('2d');

                // Create separate layer for drawing if not exists
                if (!drawingDataRefs.current[emotion]) {
                    const drawCanvas = document.createElement('canvas');
                    drawCanvas.width = canvas.width;
                    drawCanvas.height = canvas.height;
                    drawingDataRefs.current[emotion] = drawCanvas;
                }

                // Draw initial state
                redrawCanvas(emotion);
            }
        });
    }, []);

    const drawBodyOutline = (ctx, width, height) => {
        const w = width;
        const h = height;

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Head (circle)
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.12, h * 0.08, 0, Math.PI * 2);
        ctx.stroke();

        // Face features
        ctx.beginPath();
        // Left eye
        ctx.arc(w * 0.45, h * 0.10, 2, 0, Math.PI * 2);
        ctx.moveTo(w * 0.55 + 2, h * 0.10);
        // Right eye
        ctx.arc(w * 0.55, h * 0.10, 2, 0, Math.PI * 2);
        ctx.stroke();

        // Nose
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.11);
        ctx.lineTo(w * 0.48, h * 0.13);
        ctx.lineTo(w * 0.52, h * 0.13);
        ctx.stroke();

        // Mouth
        ctx.beginPath();
        ctx.moveTo(w * 0.45, h * 0.15);
        ctx.quadraticCurveTo(w * 0.5, h * 0.16, w * 0.55, h * 0.15);
        ctx.stroke();

        // Neck (fuller)
        ctx.beginPath();
        ctx.moveTo(w * 0.44, h * 0.2);
        ctx.lineTo(w * 0.44, h * 0.25);
        ctx.moveTo(w * 0.56, h * 0.2);
        ctx.lineTo(w * 0.56, h * 0.25);
        ctx.stroke();

        // Torso (fuller body shape)
        ctx.beginPath();
        // Shoulders
        ctx.moveTo(w * 0.44, h * 0.25);
        ctx.lineTo(w * 0.3, h * 0.27);
        ctx.moveTo(w * 0.56, h * 0.25);
        ctx.lineTo(w * 0.7, h * 0.27);

        // Left side of torso
        ctx.moveTo(w * 0.3, h * 0.27);
        ctx.quadraticCurveTo(w * 0.28, h * 0.35, w * 0.3, h * 0.43);
        ctx.quadraticCurveTo(w * 0.32, h * 0.51, w * 0.35, h * 0.58);

        // Right side of torso
        ctx.moveTo(w * 0.7, h * 0.27);
        ctx.quadraticCurveTo(w * 0.72, h * 0.35, w * 0.7, h * 0.43);
        ctx.quadraticCurveTo(w * 0.68, h * 0.51, w * 0.65, h * 0.58);

        // Bottom of torso/hips
        ctx.moveTo(w * 0.35, h * 0.58);
        ctx.quadraticCurveTo(w * 0.5, h * 0.6, w * 0.65, h * 0.58);
        ctx.stroke();

        // Left arm (fuller with proper shape)
        ctx.beginPath();
        // Upper arm
        ctx.moveTo(w * 0.3, h * 0.27);
        ctx.quadraticCurveTo(w * 0.25, h * 0.32, w * 0.23, h * 0.38);
        ctx.quadraticCurveTo(w * 0.21, h * 0.44, w * 0.22, h * 0.5);
        // Lower arm
        ctx.quadraticCurveTo(w * 0.23, h * 0.56, w * 0.24, h * 0.62);
        ctx.lineTo(w * 0.24, h * 0.65);
        // Back of arm
        ctx.moveTo(w * 0.3, h * 0.31);
        ctx.quadraticCurveTo(w * 0.28, h * 0.36, w * 0.27, h * 0.42);
        ctx.quadraticCurveTo(w * 0.26, h * 0.48, w * 0.27, h * 0.54);
        ctx.quadraticCurveTo(w * 0.28, h * 0.59, w * 0.28, h * 0.64);
        // Hand
        ctx.moveTo(w * 0.26, h * 0.65);
        ctx.ellipse(w * 0.26, h * 0.67, w * 0.025, h * 0.03, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Right arm (fuller with proper shape)
        ctx.beginPath();
        // Upper arm
        ctx.moveTo(w * 0.7, h * 0.27);
        ctx.quadraticCurveTo(w * 0.75, h * 0.32, w * 0.77, h * 0.38);
        ctx.quadraticCurveTo(w * 0.79, h * 0.44, w * 0.78, h * 0.5);
        // Lower arm
        ctx.quadraticCurveTo(w * 0.77, h * 0.56, w * 0.76, h * 0.62);
        ctx.lineTo(w * 0.76, h * 0.65);
        // Back of arm
        ctx.moveTo(w * 0.7, h * 0.31);
        ctx.quadraticCurveTo(w * 0.72, h * 0.36, w * 0.73, h * 0.42);
        ctx.quadraticCurveTo(w * 0.74, h * 0.48, w * 0.73, h * 0.54);
        ctx.quadraticCurveTo(w * 0.72, h * 0.59, w * 0.72, h * 0.64);
        // Hand
        ctx.moveTo(w * 0.74, h * 0.65);
        ctx.ellipse(w * 0.74, h * 0.67, w * 0.025, h * 0.03, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Left leg (fuller thigh and calf)
        ctx.beginPath();
        // Outer thigh
        ctx.moveTo(w * 0.38, h * 0.59);
        ctx.quadraticCurveTo(w * 0.36, h * 0.68, w * 0.35, h * 0.76);
        // Outer calf
        ctx.quadraticCurveTo(w * 0.34, h * 0.84, w * 0.33, h * 0.92);
        ctx.lineTo(w * 0.32, h * 0.95);
        // Inner leg
        ctx.moveTo(w * 0.45, h * 0.59);
        ctx.quadraticCurveTo(w * 0.44, h * 0.68, w * 0.42, h * 0.76);
        ctx.quadraticCurveTo(w * 0.40, h * 0.84, w * 0.38, h * 0.92);
        ctx.lineTo(w * 0.37, h * 0.95);
        // Foot
        ctx.moveTo(w * 0.32, h * 0.95);
        ctx.lineTo(w * 0.28, h * 0.96);
        ctx.lineTo(w * 0.28, h * 0.97);
        ctx.lineTo(w * 0.38, h * 0.97);
        ctx.lineTo(w * 0.37, h * 0.95);
        ctx.stroke();

        // Right leg (fuller thigh and calf)
        ctx.beginPath();
        // Inner thigh
        ctx.moveTo(w * 0.55, h * 0.59);
        ctx.quadraticCurveTo(w * 0.56, h * 0.68, w * 0.58, h * 0.76);
        // Inner calf
        ctx.quadraticCurveTo(w * 0.60, h * 0.84, w * 0.62, h * 0.92);
        ctx.lineTo(w * 0.63, h * 0.95);
        // Outer leg
        ctx.moveTo(w * 0.62, h * 0.59);
        ctx.quadraticCurveTo(w * 0.64, h * 0.68, w * 0.65, h * 0.76);
        ctx.quadraticCurveTo(w * 0.66, h * 0.84, w * 0.67, h * 0.92);
        ctx.lineTo(w * 0.68, h * 0.95);
        // Foot
        ctx.moveTo(w * 0.63, h * 0.95);
        ctx.lineTo(w * 0.62, h * 0.97);
        ctx.lineTo(w * 0.72, h * 0.97);
        ctx.lineTo(w * 0.72, h * 0.96);
        ctx.lineTo(w * 0.68, h * 0.95);
        ctx.stroke();
    };

    const redrawCanvas = (emotion) => {
        const canvas = canvasRefs.current[emotion];
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const drawingCanvas = drawingDataRefs.current[emotion];

        // Clear main canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the colored layer (from offscreen canvas)
        if (drawingCanvas) {
            ctx.drawImage(drawingCanvas, 0, 0);
        }

        // Draw body outline on top
        drawBodyOutline(ctx, canvas.width, canvas.height);
    };

    const startDrawing = (e, emotion) => {
        const canvas = canvasRefs.current[emotion];
        if (!canvas) return;

        isDrawing.current = true;
        currentEmotion.current = emotion;

        const rect = canvas.getBoundingClientRect();
        // Handle touch or mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const drawingCanvas = drawingDataRefs.current[emotion];
        const drawCtx = drawingCanvas.getContext('2d');

        drawCtx.beginPath();
        drawCtx.moveTo(x, y);
    };

    const draw = (e, emotion) => {
        if (!isDrawing.current || currentEmotion.current !== emotion) return;

        const canvas = canvasRefs.current[emotion];
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const drawingCanvas = drawingDataRefs.current[emotion];
        const drawCtx = drawingCanvas.getContext('2d');

        if (isErasing) {
            drawCtx.globalCompositeOperation = 'destination-out';
            drawCtx.lineWidth = brushSize * 2;
        } else {
            drawCtx.globalCompositeOperation = 'source-over';
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = brushSize;
            drawCtx.globalAlpha = 0.6;
        }

        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.lineTo(x, y);
        drawCtx.stroke();

        redrawCanvas(emotion);
    };

    const stopDrawing = () => {
        isDrawing.current = false;
        currentEmotion.current = null;
    };

    const handleColorClick = (color) => {
        setCurrentColor(color);
        setIsErasing(false);
    };

    const handleEraserClick = () => {
        setIsErasing(!isErasing);
    };

    const handleClearAll = () => {
        if (window.confirm('Are you sure you want to clear all your drawings?')) {
            emotions.forEach(emotion => {
                const canvas = canvasRefs.current[emotion];
                const drawingCanvas = drawingDataRefs.current[emotion];
                if (canvas && drawingCanvas) {
                    const drawCtx = drawingCanvas.getContext('2d');
                    drawCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                    redrawCanvas(emotion);
                }
            });
        }
    };

    const handleSave = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1200;
        tempCanvas.height = 450;
        const tempCtx = tempCanvas.getContext('2d');

        // Background
        const gradient = tempCtx.createLinearGradient(0, 0, 0, tempCanvas.height);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#f1f8e9');
        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Branding
        tempCtx.font = '18px Georgia, serif';
        tempCtx.fillStyle = '#81c784';
        tempCtx.textAlign = 'center';
        tempCtx.letterSpacing = '3px';
        tempCtx.fillText('INKIND EMDR', tempCanvas.width / 2, 25);

        // Title
        tempCtx.font = 'bold 26px Georgia, serif';
        tempCtx.fillStyle = '#2c5f2d';
        tempCtx.textAlign = 'center';
        tempCtx.fillText('My Emotion Body Map', tempCanvas.width / 2, 55);

        // Date
        tempCtx.font = '14px Georgia, serif';
        tempCtx.fillStyle = '#5a7c5a';
        tempCtx.fillText(new Date().toLocaleDateString('en-GB'), tempCanvas.width / 2, 75);

        // Draw each canvas
        emotions.forEach((emotion, index) => {
            const canvas = canvasRefs.current[emotion];
            if (canvas) {
                const x = 50 + (index * 190);
                const y = 100;

                tempCtx.drawImage(canvas, x, y, 180, 300);

                // Add label
                tempCtx.font = '16px Georgia, serif';
                tempCtx.textAlign = 'center';
                const labelColors = {
                    'anxiety': '#e57373',
                    'sadness': '#5c9ead',
                    'anger': '#ff8a65',
                    'pain': '#7986cb',
                    'happiness': '#ffb74d',
                    'custom': '#81c784'
                };
                tempCtx.fillStyle = labelColors[emotion];

                let labelText;
                if (emotion === 'pain') {
                    labelText = 'Pain/Hurt';
                } else if (emotion === 'custom') {
                    labelText = customEmotionLabel || 'Custom';
                } else {
                    labelText = emotion.charAt(0).toUpperCase() + emotion.slice(1);
                }

                tempCtx.fillText(labelText, x + 90, y + 320);
            }
        });

        const link = document.createElement('a');
        link.download = `inkind-emdr-emotion-map-${new Date().toISOString().split('T')[0]}.png`;
        link.href = tempCanvas.toDataURL();
        link.click();
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.container}>
                <div className={styles.logoArea}>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        <IoArrowBack size={24} />
                    </button>
                    <span className={styles.logoText}>INKIND EMDR</span>
                </div>
                <h1 className={styles.title}>Where Do You Feel It?</h1>
                <p className={styles.subtitle}>
                    Your body holds emotions in different places. Draw each emotion's shape and colour - it might be a tight knot, a swirling cloud, heavy blocks, or flowing waves.
                </p>

                <div className={styles.instructions}>
                    <h3>How to use this tool:</h3>
                    <p>
                        1. Pick a colour from the palette that feels right for each emotion<br />
                        2. Draw the emotion inside each body - show its shape, size, and where it lives<br />
                        3. Your emotions might be swirls, blocks, waves, or any shape that feels true<br />
                        4. Layer different colours to show how emotions overlap or change
                    </p>
                </div>

                <div className={styles.mainContent}>
                    <div className={styles.colorPalette}>
                        <h3 className={styles.paletteTitle}>Choose Your Colour</h3>
                        <div className={styles.colorGrid}>
                            {colors.map(color => (
                                <button
                                    key={color}
                                    className={`${styles.colorBtn} ${currentColor === color && !isErasing ? styles.colorBtnActive : ''}`}
                                    style={{ background: color }}
                                    onClick={() => handleColorClick(color)}
                                />
                            ))}
                        </div>

                        <div className={styles.customColorWrapper}>
                            <label className={styles.customColorLabel} htmlFor="customColor">Or choose your own:</label>
                            <input
                                type="color"
                                id="customColor"
                                className={styles.customColorInput}
                                value={customColor}
                                onChange={(e) => {
                                    setCustomColor(e.target.value);
                                    handleColorClick(e.target.value);
                                }}
                            />
                        </div>

                        <div className={styles.brushSize}>
                            <label className={styles.brushLabel} htmlFor="brushSize">Brush Size:</label>
                            <input
                                type="range"
                                id="brushSize"
                                min="5"
                                max="30"
                                value={brushSize}
                                className={styles.brushInput}
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            />
                        </div>

                        <div className={styles.tools}>
                            <button
                                className={`${styles.toolBtn} ${styles.eraser} ${isErasing ? styles.eraserActive : ''}`}
                                onClick={handleEraserClick}
                            >
                                Eraser
                            </button>
                            <button
                                className={`${styles.toolBtn} ${styles.clear}`}
                                onClick={handleClearAll}
                            >
                                Clear All
                            </button>
                            <button
                                className={`${styles.toolBtn} ${styles.save}`}
                                onClick={handleSave}
                            >
                                Save My Map
                            </button>
                        </div>
                    </div>

                    <div className={styles.bodiesContainer}>
                        {emotions.map(emotion => (
                            <div key={emotion} className={styles.bodyWrapper}>
                                <div className={styles.canvasContainer}>
                                    <canvas
                                        ref={el => canvasRefs.current[emotion] = el}
                                        width={180}
                                        height={300}
                                        className={`${styles.canvas} ${isErasing ? styles.grabCursor : ''}`}
                                        onMouseDown={(e) => startDrawing(e, emotion)}
                                        onMouseMove={(e) => draw(e, emotion)}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={(e) => {
                                            e.preventDefault(); // Prevent scrolling
                                            startDrawing(e, emotion);
                                        }}
                                        onTouchMove={(e) => {
                                            e.preventDefault(); // Prevent scrolling
                                            draw(e, emotion);
                                        }}
                                        onTouchEnd={(e) => {
                                            e.preventDefault();
                                            stopDrawing();
                                        }}
                                    />
                                </div>
                                {emotion === 'custom' ? (
                                    <input
                                        type="text"
                                        className={styles.customEmotionInput}
                                        placeholder="Your emotion..."
                                        maxLength={20}
                                        value={customEmotionLabel}
                                        onChange={(e) => setCustomEmotionLabel(e.target.value)}
                                    />
                                ) : (
                                    <h3 className={`${styles.emotionLabel} ${styles[emotion]}`}>
                                        {emotion === 'pain' ? 'Pain/Hurt' : emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                                    </h3>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
