"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoredAuth } from "@/redux/authStorage";
import axios from "axios";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export default function ConsentPage() {
    const router = useRouter();
    const { user, token, isAuthenticated } = useStoredAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        fullName: user?.name || "",
        dob: "",
        sex: "",
        email: user?.email || "",
        signature: "",
        contraindications: [],
        researchConsent: false,
        understandTreatment: false,
        dataProcessing: false,
        voluntaryConsent: false,
        emergencyProtocol: false,
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.name || prev.fullName,
                email: user.email || prev.email
            }));
        }
    }, [user]);

    const [hasContraindication, setHasContraindication] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e) => {
        const { name, value, checked } = e.target;
        if (name === "contraindications") {
            setFormData((prev) => ({
                ...prev,
                contraindications: checked
                    ? [...prev.contraindications, value]
                    : prev.contraindications.filter((item) => item !== value),
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: checked }));
        }
    };

    useEffect(() => {
        setHasContraindication(formData.contraindications.length > 0);
    }, [formData.contraindications]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Submitting Consent with formData:", formData);
        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        const newErrors = {};
        if (!formData.fullName?.trim()) newErrors.fullName = "Full Name is required";
        if (!formData.dob) newErrors.dob = "Date of Birth is required";
        if (!formData.sex) newErrors.sex = "Please select your sex";
        if (!formData.email?.trim()) newErrors.email = "Email address is required";
        if (!formData.understandTreatment) newErrors.understandTreatment = "This consent is required to proceed";
        if (!formData.dataProcessing) newErrors.dataProcessing = "This consent is required to proceed";
        if (!formData.voluntaryConsent) newErrors.voluntaryConsent = "This consent is required to proceed";
        if (!formData.emergencyProtocol) newErrors.emergencyProtocol = "This consent is required to proceed";
        if (!formData.signature?.trim()) newErrors.signature = "Please sign the form by typing your name";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsSubmitting(false);
            // Scroll to the first error
            const firstErrorField = Object.keys(newErrors)[0];
            const element = document.getElementById(firstErrorField);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setErrors({});

        try {
            // 1. Profile POST
            const profileData = {
                dateOfBirth: formData.dob,
                sex: formData.sex
            };
            console.log("Step 1: Profile POST", profileData);
            await axios.post(`${baseUrl}/api/onboarding/profile`, profileData, config);

            // 2. Safety Check POST
            const safetyData = {
                activeSuicidalThoughts: formData.contraindications.includes("suicidal"),
                historyOfSeizures: formData.contraindications.includes("seizures"),
                pregnancy: formData.contraindications.includes("pregnancy"),
                severeDissociativeDisorders: formData.contraindications.includes("dissociative"),
                activePsychosis: formData.contraindications.includes("psychosis")
            };
            console.log("Step 2: Safety Check POST", safetyData);
            await axios.post(`${baseUrl}/api/onboarding/safety-check`, safetyData, config);

            // 3. Consent POST
            const consentData = {
                understoodEMDRNatureAndRisks: formData.understandTreatment,
                agreedToGDPR: formData.dataProcessing,
                participatingVoluntarily: formData.voluntaryConsent,
                savedCrisisSupportNumbers: formData.emergencyProtocol,
                optionalResearchParticipation: formData.researchConsent,
                electronicSignature: formData.signature
            };
            console.log("Step 3: Consent POST", consentData);
            await axios.post(`${baseUrl}/api/onboarding/consent`, consentData, config);

            router.push("/assessment/phq9");
        } catch (error) {
            console.error("Onboarding error at step:", error.config?.url);
            console.error("Error details:", JSON.stringify(error.response?.data || error, null, 2));
            // Stop redirecting on validation error so user can fix it
            if (error.response?.status === 400) {
                alert("There was a validation error. Please check your information and try again.");
                setIsSubmitting(false);
                return;
            }
            router.push("/assessment/phq9");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="consent-page-root">
            <style dangerouslySetInnerHTML={{
                __html: `
        .consent-page-root {
          font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: #ffffff;
          min-height: 100vh;
          margin: 0;
          padding: 0;
        }
        
        .header-bar {
          background: #1a1a1a;
          color: white;
          padding: 20px 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .logo {
          font-size: 24px;
          font-weight: 300;
          letter-spacing: 2px;
        }
        
        .header-tag {
          font-size: 12px;
          letter-spacing: 1px;
          opacity: 0.7;
          text-transform: uppercase;
        }
        
        .main-container {
          max-width: 900px;
          margin: 60px auto;
          padding: 0 40px;
        }
        
        .form-header {
          text-align: center;
          margin-bottom: 60px;
          padding-bottom: 40px;
          border-bottom: 1px solid #e5e5e5;
        }
        
        .form-header h1 {
          font-size: 36px;
          font-weight: 300;
          color: #1a1a1a;
          margin-bottom: 15px;
          letter-spacing: -0.5px;
        }
        
        .form-header p {
          font-size: 16px;
          color: #666;
          font-weight: 300;
        }
        
        .section {
          margin-bottom: 50px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #17b5a7;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
        }
        
        .section-title::before {
          content: '';
          display: inline-block;
          width: 30px;
          height: 1px;
          background: #17b5a7;
          margin-right: 15px;
        }
        
        .form-group {
          margin-bottom: 25px;
        }
        
        label {
          display: block;
          margin-bottom: 10px;
          font-size: 14px;
          font-weight: 400;
          color: #333;
          letter-spacing: 0.5px;
        }
        
        .required::after {
          content: ' *';
          color: #dc2626;
        }
        .error-text {
          color: #dc2626;
          font-size: 12px;
          margin-top: 5px;
          font-weight: 500;
        }
        .input-error {
          border-bottom-color: #dc2626 !important;
        }
        
        input[type="text"],
        input[type="email"],
        input[type="date"],
        select {
          width: 100%;
          padding: 14px 0;
          border: none;
          border-bottom: 1px solid #d0d0d0;
          font-size: 15px;
          font-family: inherit;
          background: transparent;
          transition: all 0.3s ease;
          color: #1a1a1a;
        }
        
        input[type="text"]:focus,
        input[type="email"]:focus,
        input[type="date"]:focus,
        select:focus {
          outline: none;
          border-bottom-color: #17b5a7;
        }
        
        select {
          cursor: pointer;
        }
        
        .info-card {
          background: #f8f8f8;
          padding: 30px;
          margin: 25px 0;
          border-left: 3px solid #17b5a7;
          font-size: 14px;
          line-height: 1.8;
          color: #333;
        }
        
        .info-card strong {
          color: #1a1a1a;
          font-weight: 500;
        }
        
        .warning-card {
          background: #fff9f5;
          padding: 30px;
          margin: 25px 0;
          border-left: 3px solid #ff8c42;
          font-size: 14px;
          line-height: 1.8;
          color: #333;
        }
        
        .risk-card {
          background: #fff5f5;
          padding: 30px;
          margin: 25px 0;
          border-left: 3px solid #ff6b6b;
          font-size: 14px;
          line-height: 1.8;
          color: #333;
        }
        
        .consent-page-root ul {
          margin: 15px 0;
          padding-left: 20px;
          list-style: none;
        }
        
        .consent-page-root ul li {
          margin: 10px 0;
          padding-left: 20px;
          position: relative;
          font-size: 14px;
          color: #555;
        }
        
        .consent-page-root ul li::before {
          content: '–';
          position: absolute;
          left: 0;
          color: #17b5a7;
        }
        
        .screening-items {
          margin: 20px 0;
        }
        
        .screening-item {
          padding: 15px 20px;
          margin: 10px 0;
          background: white;
          border: 1px solid #e5e5e5;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .screening-item:hover {
          border-color: #ff8c42;
          background: #fff9f5;
        }
        
        .screening-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          margin-right: 15px;
          vertical-align: middle;
          cursor: pointer;
          accent-color: #ff8c42;
        }
        
        .screening-item label {
          cursor: pointer;
          display: inline;
          font-size: 14px;
        }
        
        .contraindication-alert {
          background: #ffebee;
          border: 2px solid #ff6b6b;
          padding: 25px;
          margin: 20px 0;
          border-radius: 4px;
          text-align: center;
        }
        
        .contraindication-alert p {
          margin: 8px 0;
          color: #d32f2f;
          font-size: 14px;
        }
        
        .contraindication-alert strong {
          color: #c62828;
        }
        
        .form-disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        
        .consent-item {
          margin: 20px 0;
          padding: 25px;
          background: #ffffff;
          border: 1px solid #e5e5e5;
          transition: all 0.3s ease;
        }
        
        .consent-item:hover {
          border-color: #17b5a7;
          box-shadow: 0 2px 10px rgba(23, 181, 167, 0.1);
        }
        
        .consent-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          margin-right: 15px;
          vertical-align: middle;
          cursor: pointer;
          accent-color: #17b5a7;
        }
        
        .consent-item label {
          display: inline;
          cursor: pointer;
          font-weight: 400;
          margin-bottom: 0;
        }
        
        .consent-description {
          font-size: 13px;
          color: #666;
          margin-top: 10px;
          margin-left: 33px;
          line-height: 1.6;
        }
        
        .research-consent {
          background: #f0fffe;
          border: 2px solid #17b5a7;
        }
        
        .signature-section {
          margin-top: 40px;
          padding: 35px;
          background: #f8f8f8;
          border: 1px solid #e5e5e5;
        }
        
        .btn-submit {
          background: #17b5a7;
          color: white;
          padding: 16px 50px;
          border: none;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          display: block;
          margin: 50px auto 0;
        }
        
        .btn-submit:hover {
          background: #14a093;
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(23, 181, 167, 0.3);
        }
        
        .btn-submit:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .footer-section {
          text-align: center;
          color: #999;
          font-size: 12px;
          margin-top: 60px;
          padding-top: 40px;
          border-top: 1px solid #e5e5e5;
          line-height: 1.8;
        }
        
        @media (max-width: 768px) {
          .main-container {
            padding: 0 20px;
            margin: 40px auto;
          }
          .header-content {
            padding: 0 20px;
          }
          .form-header h1 {
            font-size: 28px;
          }
          .btn-submit {
            width: 100%;
          }
        }
      ` }} />

            <div className="header-bar">
                <div className="header-content">
                    <div>
                        <div className="logo">INKIND</div>
                        <div className="header-tag">National Psychology Clinic</div>
                    </div>
                </div>
            </div>

            <div className="main-container">
                <div className="form-header">
                    <h1>EMDR Digital Therapy Programme</h1>
                    <p>Informed Consent & Data Processing Agreement</p>
                </div>

                <form onSubmit={handleSubmit} id="consentForm" noValidate>
                    {/* Personal Information */}
                    <div className="section">
                        <h2 className="section-title">Personal Information</h2>
                        <div className="form-group">
                            <label htmlFor="fullName" className="required">Full Name</label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className={errors.fullName ? "input-error" : ""}
                                autoFocus
                            />
                            {errors.fullName && <div className="error-text">{errors.fullName}</div>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="dob" className="required">Date of Birth</label>
                            <input
                                type="date"
                                id="dob"
                                name="dob"
                                value={formData.dob}
                                onChange={handleInputChange}
                                className={errors.dob ? "input-error" : ""}
                            />
                            {errors.dob && <div className="error-text">{errors.dob}</div>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="sex" className="required">Sex</label>
                            <select
                                id="sex"
                                name="sex"
                                value={formData.sex}
                                onChange={handleInputChange}
                                className={errors.sex ? "input-error" : ""}
                            >
                                <option value="">Please select</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                <option value="prefer-not-to-say">Prefer not to say</option>
                            </select>
                            {errors.sex && <div className="error-text">{errors.sex}</div>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="email" className="required">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className={errors.email ? "input-error" : ""}
                            />
                            {errors.email && <div className="error-text">{errors.email}</div>}
                        </div>
                    </div>

                    {/* Treatment Information */}
                    <div className="section">
                        <h2 className="section-title">About EMDR Therapy</h2>
                        <div className="info-card">
                            <p>
                                <strong>Eye Movement Desensitization and Reprocessing (EMDR)</strong> is a psychotherapy treatment recognised by the World Health Organization (WHO) for treating trauma and PTSD. This digital programme combines standard EMDR sessions with Cognitive Behavioural Therapy (CBT) techniques.
                            </p>
                            <p style={{ marginTop: "15px" }}>
                                EMDR uses bilateral stimulation (eye movements, tapping, or auditory tones) to help your brain process troubling memories. The treatment follows eight structured phases and has been shown to be effective for approximately 67% of trauma cases.
                            </p>
                        </div>
                    </div>

                    {/* Medical Screening */}
                    <div className="section">
                        <h2 className="section-title">Medical & Safety Screening</h2>
                        <div className="warning-card">
                            <p><strong>Important Safety Check:</strong> Do you currently have or experience any of the following conditions?</p>
                            <p style={{ marginTop: "10px", fontSize: "13px" }}>
                                Please check any that apply to you. <strong>Note: You cannot continue with this programme if you are actively suicidal.</strong>
                            </p>
                        </div>
                        <div className="screening-items">
                            {[
                                { id: "suicidal", label: "Active suicidal thoughts or plans" },
                                { id: "seizures", label: "History of seizures" },
                                { id: "pregnancy", label: "Pregnancy" },
                                { id: "dissociative", label: "Severe dissociative disorders" },
                                { id: "psychosis", label: "Active psychosis" },
                            ].map((item) => (
                                <div className="screening-item" key={item.id}>
                                    <input
                                        type="checkbox"
                                        id={item.id}
                                        name="contraindications"
                                        value={item.id}
                                        className="contraindication-check"
                                        checked={formData.contraindications.includes(item.id)}
                                        onChange={handleCheckboxChange}
                                    />
                                    <label htmlFor={item.id}>{item.label}</label>
                                </div>
                            ))}
                        </div>

                        {hasContraindication && (
                            <div className="contraindication-alert" id="contraindicationAlert">
                                <p><strong>⚠️ Medical Review Required</strong></p>
                                <p>You have indicated one or more conditions that require medical review before proceeding with EMDR therapy. Please contact your GP or our clinical team to discuss your suitability for this treatment.</p>
                                <p style={{ marginTop: "10px" }}>
                                    <strong>If you are experiencing suicidal thoughts, please contact your GP immediately or call 999.</strong>
                                </p>
                                <p style={{ marginTop: "10px" }}>
                                    Clinical team contact: <strong>0800 XXX XXXX</strong> or email <strong>clinical@inkind.uk</strong>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Risks and Side Effects */}
                    <div className={`section ${hasContraindication ? 'form-disabled' : ''}`}>
                        <h2 className="section-title">Potential Risks and Side Effects</h2>
                        <div className="risk-card">
                            <p><strong>Important:</strong> EMDR therapy may cause temporary side effects including:</p>
                            <ul>
                                <li>Heightened emotions and vivid dreams</li>
                                <li>Physical sensations (headaches, dizziness, fatigue)</li>
                                <li>Emergence of associated memories</li>
                                <li>Continuation of processing between sessions</li>
                                <li>Temporary increase in distress levels</li>
                            </ul>
                        </div>
                    </div>

                    {/* Data Protection */}
                    <div className={`section ${hasContraindication ? 'form-disabled' : ''}`}>
                        <h2 className="section-title">Data Protection & Privacy (UK GDPR)</h2>
                        <div className="info-card">
                            <p><strong>How we process your data:</strong></p>
                            <ul>
                                <li><strong>Legal Basis:</strong> We process your health data under Article 9(2)(h) UK GDPR for healthcare provision</li>
                                <li><strong>Data Storage:</strong> Your data is securely stored on Amazon Web Services (AWS) Elastic Beanstalk in UK/EU data centres</li>
                                <li><strong>Encryption:</strong> All data is encrypted at rest (AES-256) and in transit (TLS 1.2+)</li>
                                <li><strong>Retention:</strong> Clinical records are retained for 8 years (adults) or until age 25 (children)</li>
                                <li><strong>Access:</strong> Only authorised healthcare professionals have access to your data</li>
                            </ul>
                        </div>
                        <div className="info-card">
                            <p><strong>Your Rights:</strong> Under UK GDPR, you have the right to:</p>
                            <ul>
                                <li>Access your personal data</li>
                                <li>Rectify inaccurate data</li>
                                <li>Object to processing</li>
                                <li>Lodge a complaint with the Information Commissioner's Office (ICO)</li>
                            </ul>
                            <p style={{ marginTop: "15px" }}><em>Note: Right to erasure is limited due to clinical record-keeping requirements.</em></p>
                        </div>
                    </div>

                    {/* Research Consent */}
                    <div className={`section ${hasContraindication ? 'form-disabled' : ''}`}>
                        <h2 className="section-title">Optional Research Participation</h2>
                        <div className="consent-item research-consent">
                            <input
                                type="checkbox"
                                id="researchConsent"
                                name="researchConsent"
                                checked={formData.researchConsent}
                                onChange={handleCheckboxChange}
                            />
                            <label htmlFor="researchConsent">
                                <strong>I consent to my anonymised data being used for future research purposes</strong>
                            </label>
                            <div className="consent-description">
                                Your therapy data may be anonymised (all identifying information removed) and used to improve EMDR treatments and develop better mental health interventions. This is entirely optional and will not affect your treatment. You may withdraw this consent at any time without affecting your care.
                            </div>
                        </div>
                    </div>

                    {/* Client Rights */}
                    <div className={`section ${hasContraindication ? 'form-disabled' : ''}`}>
                        <h2 className="section-title">Your Rights During Treatment</h2>
                        <div className="info-card">
                            <p>You have the right to:</p>
                            <ul>
                                <li>Withdraw from the programme whenever you would like to and cancel your subscription</li>
                                <li>Refuse any specific intervention</li>
                                <li>Access emergency support if needed</li>
                            </ul>
                        </div>
                    </div>

                    {/* Crisis Support */}
                    <div className={`section ${hasContraindication ? 'form-disabled' : ''}`}>
                        <h2 className="section-title">Crisis Support & Emergency Contacts</h2>
                        <div className="warning-card">
                            <p><strong>If you are experiencing a mental health crisis or emergency:</strong></p>
                            <ul>
                                <li><strong>Contact your GP immediately</strong></li>
                                <li><strong>Samaritans</strong> - Call 116 123</li>
                                <li><strong>Crisis Text Line</strong> - Text "SHOUT" to 85258</li>
                                <li><strong>999 or A&E</strong> - For immediate danger</li>
                            </ul>
                        </div>
                    </div>

                    {/* Consent Declarations */}
                    <div className={`section ${hasContraindication ? 'form-disabled' : ''}`} id="consentSection">
                        <h2 className="section-title">Consent Declarations</h2>
                        {[
                            { id: "understandTreatment", label: "I understand the nature of EMDR therapy and its potential risks and benefits" },
                            { id: "dataProcessing", label: "I understand how my data will be processed and stored in accordance with UK GDPR" },
                            { id: "voluntaryConsent", label: "I am participating voluntarily and understand I can withdraw at any time" },
                            { id: "emergencyProtocol", label: "I understand the emergency procedures and have saved the crisis support numbers provided" },
                        ].map((decl) => (
                            <div className="consent-item" key={decl.id}>
                                <input
                                    type="checkbox"
                                    id={decl.id}
                                    name={decl.id}
                                    checked={formData[decl.id]}
                                    onChange={handleCheckboxChange}
                                />
                                <label htmlFor={decl.id}>{decl.label}</label>
                                {errors[decl.id] && <div className="error-text" style={{ marginLeft: "25px" }}>{errors[decl.id]}</div>}
                            </div>
                        ))}
                    </div>

                    {/* Electronic Signature */}
                    <div className={`section ${hasContraindication ? 'form-disabled' : ''}`} id="signatureSection">
                        <h2 className="section-title">Electronic Signature</h2>
                        <div className="signature-section">
                            <div className="form-group">
                                <label htmlFor="signature" className="required">Type your full name to sign electronically</label>
                                <input
                                    type="text"
                                    id="signature"
                                    name="signature"
                                    value={formData.signature}
                                    onChange={handleInputChange}
                                    className={errors.signature ? "input-error" : ""}
                                    placeholder="Enter your full name as it appears above"
                                />
                                {errors.signature && <div className="error-text">{errors.signature}</div>}
                            </div>
                            <p style={{ fontSize: "13px", color: "#666", marginTop: "15px" }}>
                                By typing your name above, you confirm that you have read, understood, and agree to the terms outlined in this consent form. This electronic signature is legally binding.
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    {!hasContraindication && (
                        <button type="submit" className="btn-submit" id="submitBtn" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Submit Consent"}
                        </button>
                    )}

                    <div className="footer-section">
                        <p>This form is compliant with UK GDPR Standards</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
