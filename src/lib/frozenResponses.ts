// src/lib/frozenResponses.ts

export const FROZEN_RESPONSES: Record<string, any> = {
  "did dupilumab receive fda approval for asthma before chronic rhinosinusitis?": {
    "answer": "Yes, Dupilumab received FDA approval for asthma before it was approved for chronic rhinosinusitis. The FDA approved Dupilumab for the treatment of moderate to severe asthma in October 2018. This approval was based on its efficacy in reducing asthma exacerbations and improving lung function in patients with this condition. In contrast, Dupilumab was later approved for chronic rhinosinusitis with nasal polyps in June 2019. The sequence of these approvals indicates that asthma was prioritized in the approval process for this medication.\n\nThe approval for asthma was significant as it marked a new treatment option for patients who had limited control over their symptoms with existing therapies. The subsequent approval for chronic rhinosinusitis further expanded the therapeutic applications of Dupilumab, showcasing its versatility in treating inflammatory conditions. However, the initial focus on asthma reflects the urgent need for effective treatments in that area, which was recognized by the FDA at the time.",
    "overall_confidence": 0.9,
    "token_uncertainty": [
      { "token": "Dupilumab", "score": 0.85 },
      { "token": "FDA", "score": 0.85 },
      { "token": "approval", "score": 0.8 }
    ],
    "central_claim": "Yes, Dupilumab was approved for asthma first.",
    "relations": [
      { "source": "Dupilumab approved for asthma in 2018", "type": "SUPPORTS", "target": "Yes, Dupilumab was approved for asthma first.", "score": 0.85 },
      { "source": "Chronic rhinosinusitis approval in 2019", "type": "SUPPORTS", "target": "Yes, Dupilumab was approved for asthma first.", "score": 0.8 },
      { "source": "FDA prioritizes asthma treatments", "type": "SUPPORTS", "target": "Yes, Dupilumab was approved for asthma first.", "score": 0.7 },
      { "source": "Dupilumab's efficacy in asthma", "type": "ATTACKS", "target": "Yes, Dupilumab was approved for asthma first.", "score": 0.6 },
      { "source": "Chronic rhinosinusitis is common", "type": "ATTACKS", "target": "Yes, Dupilumab was approved for asthma first.", "score": 0.5 },
      { "source": "Dupilumab's later approval for rhinosinusitis", "type": "ATTACKS", "target": "Yes, Dupilumab was approved for asthma first.", "score": 0.4 }
    ],
    "links": [
      { "url": "https://www.fda.gov/news-events/press-announcements/fda-approves-new-treatment-children-asthma", "title": "FDA Approval for Asthma" },
      { "url": "https://www.fda.gov/news-events/press-announcements/fda-approves-new-treatment-chronic-rhinosinusitis-nasal-polyps", "title": "FDA Approval for Chronic Rhinosinusitis" }
    ],
    "recommended_searches": {
      "paragraph_level": ["Dupilumab FDA approval history", "Dupilumab asthma treatment details", "Dupilumab chronic rhinosinusitis approval"],
      "token_level": ["Dupilumab FDA approval", "Dupilumab asthma", "Dupilumab chronic rhinosinusitis"],
      "relation_level": ["FDA approval process for asthma treatments", "Dupilumab efficacy in chronic rhinosinusitis", "Comparative approval timelines for Dupilumab"]
    }
  },

  "is there more antihistamine in benadryl than rhinocort?": {
    "answer": "Yes, Benadryl contains more antihistamine than Rhinocort. Benadryl, which is the brand name for diphenhydramine, is an over-the-counter antihistamine that is commonly used to relieve allergy symptoms. It typically contains 25 mg of diphenhydramine per tablet. On the other hand, Rhinocort is a nasal spray that contains budesonide, which is a corticosteroid, not an antihistamine. While Rhinocort is effective for reducing inflammation and treating nasal allergy symptoms, it does not contain antihistamines. Therefore, in terms of antihistamine content, Benadryl has significantly more than Rhinocort.",
    "overall_confidence": 0.9,
    "token_uncertainty": [
      { "token": "Rhinocort", "score": 0.85 },
      { "token": "antihistamine", "score": 0.9 },
      { "token": "Benadryl", "score": 0.8 }
    ],
    "central_claim": "Yes, Benadryl has more antihistamine than Rhinocort.",
    "relations": [
      { "source": "Benadryl contains diphenhydramine", "type": "SUPPORTS", "target": "central_claim", "score": 0.85 },
      { "source": "Rhinocort contains budesonide", "type": "SUPPORTS", "target": "central_claim", "score": 0.8 },
      { "source": "Benadryl is an antihistamine", "type": "SUPPORTS", "target": "central_claim", "score": 0.9 },
      { "source": "Rhinocort does not contain antihistamines", "type": "ATTACKS", "target": "central_claim", "score": 0.6 },
      { "source": "Rhinocort is effective for allergies", "type": "ATTACKS", "target": "central_claim", "score": 0.5 },
      { "source": "Both treat allergy symptoms", "type": "ATTACKS", "target": "central_claim", "score": 0.4 }
    ],
    "links": [
      { "url": "https://www.drugs.com/benadryl.html", "title": "Benadryl Information" },
      { "url": "https://www.drugs.com/rhinocort.html", "title": "Rhinocort Information" },
      { "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6466220/", "title": "Antihistamines vs Corticosteroids" }
    ],
    "recommended_searches": {
      "paragraph_level": ["Benadryl vs Rhinocort comparison", "What is diphenhydramine?", "Budesonide uses and effects", "Antihistamines for allergy treatment"],
      "token_level": ["Rhinocort allergy treatment", "antihistamine effects", "Benadryl dosage information"],
      "relation_level": ["Does Rhinocort contain antihistamines?", "Effectiveness of Benadryl for allergies", "Comparison of antihistamines and corticosteroids"]
    }
  },

  "is deep vein thrombosis a common side effect of ocella?": {
    "answer": "Yes, Deep Vein Thrombosis (DVT) can be a common side effect of Ocella, which is a combination oral contraceptive containing ethinyl estradiol and drospirenone. Hormonal contraceptives, particularly those containing estrogen, have been associated with an increased risk of thromboembolic events, including DVT. This risk is particularly heightened in women who smoke, are over 35 years old, or have other risk factors such as obesity or a personal history of clotting disorders.\n\nThe mechanism behind this increased risk involves the effects of estrogen on the coagulation system, which can lead to a hypercoagulable state. While the overall risk of DVT in women taking combined oral contraceptives is still relatively low, it is significant enough to warrant caution and monitoring. Women considering or currently using Ocella should discuss their individual risk factors with their healthcare provider to make informed decisions about their contraceptive options.",
    "overall_confidence": 0.85,
    "token_uncertainty": [
      { "token": "common", "score": 0.85 },
      { "token": "effect", "score": 0.85 },
      { "token": "thrombosis", "score": 0.85 }
    ],
    "central_claim": "Yes, DVT is a common side effect of Ocella.",
    "relations": [
      { "source": "Hormonal contraceptives increase DVT risk", "type": "SUPPORTS", "target": "Yes, DVT is a common side effect of Ocella.", "score": 0.7 },
      { "source": "Ocella contains estrogen and drospirenone", "type": "SUPPORTS", "target": "Yes, DVT is a common side effect of Ocella.", "score": 0.6 },
      { "source": "Risk factors include age and smoking", "type": "SUPPORTS", "target": "Yes, DVT is a common side effect of Ocella.", "score": 0.5 },
      { "source": "DVT risk is still relatively low", "type": "ATTACKS", "target": "Yes, DVT is a common side effect of Ocella.", "score": 0.4 },
      { "source": "Not all users will experience DVT", "type": "ATTACKS", "target": "Yes, DVT is a common side effect of Ocella.", "score": 0.3 },
      { "source": "Individual risk factors vary widely", "type": "ATTACKS", "target": "Yes, DVT is a common side effect of Ocella.", "score": 0.2 }
    ],
    "links": [
      { "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6110800/", "title": "DVT and Hormonal Contraceptives" },
      { "url": "https://www.acog.org/womens-health/faqs/birth-control-pills", "title": "Birth Control Pills and Risks" },
      { "url": "https://www.mayoclinic.org/diseases-conditions/deep-vein-thrombosis/symptoms-causes/syc-20347473", "title": "Deep Vein Thrombosis Overview" }
    ],
    "recommended_searches": {
      "paragraph_level": ["Deep Vein Thrombosis risk factors", "Ocella side effects", "Hormonal contraceptives and DVT", "DVT prevalence in women"],
      "token_level": ["common side effects of Ocella", "DVT risk factors", "thrombosis and contraceptives"],
      "relation_level": ["DVT risk with hormonal contraceptives", "Ocella and blood clotting", "individual risk factors for DVT"]
    }
  },

  "is spironolactone an fda-approved drug for treating acne?": {
    "answer": "Yes, spironolactone is an FDA-approved medication that is often used off-label for treating acne, particularly in women. It is primarily a diuretic, but it has anti-androgenic properties that can help reduce sebum production and improve acne symptoms. The FDA has approved spironolactone for conditions like hypertension and heart failure, but its use for acne is based on clinical evidence and practice rather than direct FDA approval for that specific indication.\n\nWhile many dermatologists prescribe spironolactone for acne, especially in cases of hormonal acne, it is important to note that its use is considered off-label. This means that while it is commonly used for this purpose, it does not have specific FDA approval for treating acne. Patients should consult with their healthcare provider to discuss the potential benefits and risks associated with its use for acne treatment.",
    "overall_confidence": 0.85,
    "token_uncertainty": [
      { "token": "FDA", "score": 0.9 },
      { "token": "approved", "score": 0.85 },
      { "token": "acne", "score": 0.8 }
    ],
    "central_claim": "Yes, spironolactone is FDA-approved for acne treatment.",
    "relations": [
      { "source": "Spironolactone reduces sebum production", "type": "SUPPORTS", "target": "Yes, spironolactone is FDA-approved for acne treatment.", "score": 0.7 },
      { "source": "Used off-label for hormonal acne", "type": "SUPPORTS", "target": "Yes, spironolactone is FDA-approved for acne treatment.", "score": 0.6 },
      { "source": "Not specifically approved for acne", "type": "ATTACKS", "target": "Yes, spironolactone is FDA-approved for acne treatment.", "score": 0.5 },
      { "source": "FDA approval for hypertension only", "type": "ATTACKS", "target": "Yes, spironolactone is FDA-approved for acne treatment.", "score": 0.4 }    
    ],
    "links": [
      { "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6465860/", "title": "Spironolactone for Acne Treatment" },
      { "url": "https://www.aad.org/public/diseases/acne/dermatologist-recommendations", "title": "Dermatologist Recommendations for Acne" }
    ],
    "recommended_searches": {
      "paragraph_level": ["Spironolactone acne treatment effectiveness", "FDA approval process for medications"],
      "token_level": ["FDA approval for spironolactone", "spironolactone acne treatment", "approved acne medications"],
      "relation_level": ["Spironolactone hormonal acne studies", "off-label drug use for acne"]
    }
  },

  "are both simvastatin and ambien drugs that are recommended to be taken at night?": {
    "answer": "Yes, both Simvastatin and Ambien are generally recommended to be taken at night. Simvastatin is a statin medication used to lower cholesterol levels, and it is often advised to be taken in the evening because the body produces most cholesterol at night. Taking it at this time can enhance its effectiveness. On the other hand, Ambien, which is a sedative used to treat insomnia, is specifically designed to be taken right before bedtime to help induce sleep. Therefore, both medications align with nighttime dosing recommendations for their respective purposes.\n\nHowever, it is important to consider individual health conditions and consult with a healthcare provider before starting any medication. While the general guidelines suggest nighttime dosing, personal factors such as other medications, health status, and specific treatment goals may influence the timing of these medications. Always follow the advice of a healthcare professional regarding medication schedules.",
    "overall_confidence": 0.85,
    "token_uncertainty": [
      { "token": "Simvastatin", "score": 0.85 },
      { "token": "Ambien", "score": 0.85 },
      { "token": "night", "score": 0.85 }
    ],
    "central_claim": "Yes, both are recommended to be taken at night.",
    "relations": [
      { "source": "Simvastatin is effective at night", "type": "SUPPORTS", "target": "Yes, both are recommended to be taken at night.", "score": 0.85 },
      { "source": "Ambien is for nighttime use", "type": "SUPPORTS", "target": "Yes, both are recommended to be taken at night.", "score": 0.85 },
      { "source": "Consult healthcare provider for timing", "type": "ATTACKS", "target": "Yes, both are recommended to be taken at night.", "score": 0.6 },
      { "source": "Individual health may affect timing", "type": "ATTACKS", "target": "Yes, both are recommended to be taken at night.", "score": 0.6 }
    ],
    "links": [
      { "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3291234/", "title": "Simvastatin dosing guidelines" },
      { "url": "https://www.drugs.com/ambien.html", "title": "Ambien medication information" }
    ],
    "recommended_searches": {
      "paragraph_level": ["Simvastatin dosing recommendations", "Ambien usage guidelines", "Best time to take Simvastatin", "Ambien and sleep patterns"],
      "token_level": ["Simvastatin usage", "Ambien effects", "night medication recommendations"],
      "relation_level": ["Simvastatin effectiveness at night", "Ambien sleep induction", "healthcare provider medication advice"]
    }
  },

  "is uveitis a common symptom of ankylosing spondylitis?": {
    "answer": "Yes, uveitis is a common symptom associated with ankylosing spondylitis (AS). This inflammatory condition primarily affects the spine and the sacroiliac joints, but it can also lead to extra-articular manifestations, including uveitis. Studies indicate that approximately 25% to 40% of individuals with ankylosing spondylitis may experience uveitis at some point in their lives. The inflammation in the eye can lead to symptoms such as redness, pain, light sensitivity, and blurred vision, which can significantly impact the quality of life.\n\nThe relationship between ankylosing spondylitis and uveitis is thought to be linked to the underlying autoimmune processes that characterize AS. Both conditions are associated with the HLA-B27 antigen, which is present in a significant number of patients with AS. Therefore, if a patient with ankylosing spondylitis develops eye symptoms, it is crucial for them to seek medical attention promptly to manage the uveitis effectively and prevent potential complications such as vision loss.",
    "overall_confidence": 0.9,
    "token_uncertainty": [
      { "token": "uveitis", "score": 0.85 },
      { "token": "ankylosing", "score": 0.85 },
      { "token": "spondylitis", "score": 0.85 }
    ],
    "central_claim": "Yes, uveitis is common in ankylosing spondylitis.",
    "relations": [
      { "source": "Uveitis affects 25% to 40% of AS patients.", "type": "SUPPORTS", "target": "Yes, uveitis is common in ankylosing spondylitis.", "score": 0.85 },
      { "source": "HLA-B27 is linked to both conditions.", "type": "SUPPORTS", "target": "Yes, uveitis is common in ankylosing spondylitis.", "score": 0.8 },
      { "source": "Uveitis can lead to vision loss if untreated.", "type": "SUPPORTS", "target": "Yes, uveitis is common in ankylosing spondylitis.", "score": 0.7 },
      { "source": "Not all AS patients develop uveitis.", "type": "ATTACKS", "target": "Yes, uveitis is common in ankylosing spondylitis.", "score": 0.6 },
      { "source": "Uveitis can occur independently of AS.", "type": "ATTACKS", "target": "Yes, uveitis is common in ankylosing spondylitis.", "score": 0.5 },
      { "source": "Other conditions can cause uveitis.", "type": "ATTACKS", "target": "Yes, uveitis is common in ankylosing spondylitis.", "score": 0.4 }
    ],
    "links": [
      { "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6461230/", "title": "Uveitis and Ankylosing Spondylitis" },
      { "url": "https://www.rheumatology.org/Portals/0/Files/Ankylosing-Spondylitis-Patient-FAQ-2019.pdf", "title": "Ankylosing Spondylitis FAQ" },
      { "url": "https://www.aao.org/eye-health/diseases/uveitis", "title": "Understanding Uveitis" }
    ],
    "recommended_searches": {
      "paragraph_level": ["Uveitis symptoms and treatment", "Ankylosing spondylitis and eye problems"],
      "token_level": ["uveitis causes", "ankylosing spondylitis symptoms", "spondylitis treatment"],
      "relation_level": ["Uveitis prevalence in ankylosing spondylitis", "HLA-B27 and uveitis connection"]
    }
  },

  "is fever a common symptom of jock itch?": {
    "answer": "No, fever is not a common symptom of Jock Itch. Jock Itch, or tinea cruris, is a fungal infection that primarily affects the groin area, causing itching, redness, and a rash. The symptoms are localized and do not typically include systemic signs like fever. Fever usually indicates a more widespread infection or inflammatory response, which is not characteristic of Jock Itch.\n\nWhile some individuals may experience discomfort or irritation due to the rash, the absence of fever suggests that the infection is limited to the skin and does not involve deeper tissues or systemic illness. If a person with Jock Itch develops a fever, it may indicate a secondary infection or another underlying condition that requires medical evaluation.",
    "overall_confidence": 0.9,
    "token_uncertainty": [
      { "token": "fever", "score": 0.85 },
      { "token": "common", "score": 0.85 },
      { "token": "symptom", "score": 0.85 }
    ],
    "central_claim": "No, fever is not a common symptom of Jock Itch.",
    "relations": [
      { "source": "Jock Itch causes localized symptoms", "type": "SUPPORTS", "target": "No, fever is not a common symptom of Jock Itch.", "score": 0.85 },
      { "source": "Fever indicates systemic infection", "type": "SUPPORTS", "target": "No, fever is not a common symptom of Jock Itch.", "score": 0.9 },
      { "source": "Localized infections rarely cause fever", "type": "SUPPORTS", "target": "No, fever is not a common symptom of Jock Itch.", "score": 0.8 },
      { "source": "Some may confuse symptoms", "type": "ATTACKS", "target": "No, fever is not a common symptom of Jock Itch.", "score": 0.6 },
      { "source": "Secondary infections can occur", "type": "ATTACKS", "target": "No, fever is not a common symptom of Jock Itch.", "score": 0.7 },
      { "source": "Fever can accompany other conditions", "type": "ATTACKS", "target": "No, fever is not a common symptom of Jock Itch.", "score": 0.5 }
    ],
    "links": [
      { "url": "https://www.mayoclinic.org/diseases-conditions/jock-itch/symptoms-causes/syc-20347466", "title": "Jock Itch Symptoms and Causes" },
      { "url": "https://www.healthline.com/health/jock-itch", "title": "Understanding Jock Itch" },
      { "url": "https://www.webmd.com/skin-problems-and-treatments/jock-itch", "title": "Jock Itch Overview" }
    ],
    "recommended_searches": {
      "paragraph_level": ["Jock Itch symptoms", "Does Jock Itch cause fever?", "Fungal infections and fever", "Skin infections symptoms"],
      "token_level": ["fever symptoms", "common symptoms of infections", "symptom definitions"],
      "relation_level": ["Can Jock Itch cause systemic symptoms?", "What infections cause fever?", "Secondary infections and fever"]
    }
  },

  "can an adult who has not had chickenpox get shingles?": {
    "answer": "No, an adult who has not had chickenpox cannot get shingles. Shingles, also known as herpes zoster, is caused by the reactivation of the varicella-zoster virus, which is the same virus that causes chickenpox. Therefore, a person must first be infected with the varicella-zoster virus, typically during childhood, to later develop shingles. Adults who have never had chickenpox do not have the virus in their system, and thus cannot experience a reactivation of it as shingles.\n\nIt is important to note that while adults who have not had chickenpox cannot get shingles, they can still contract chickenpox if they are exposed to someone with the virus. Once they have chickenpox, they would then be at risk for developing shingles later in life. Vaccination against chickenpox can help prevent both chickenpox and shingles, as the vaccine reduces the likelihood of contracting the virus in the first place.",
    "overall_confidence": 0.95,
    "token_uncertainty": [
      { "token": "shingles", "score": 0.85 },
      { "token": "chickenpox", "score": 0.85 },
      { "token": "adults", "score": 0.8 }
    ],
    "central_claim": "No, adults without chickenpox cannot get shingles.",
    "relations": [
      { "source": "Shingles is caused by varicella-zoster virus.", "type": "SUPPORTS", "target": "No, adults without chickenpox cannot get shingles.", "score": 0.9 },
      { "source": "Only those with chickenpox can develop shingles.", "type": "SUPPORTS", "target": "No, adults without chickenpox cannot get shingles.", "score": 0.85 },
      { "source": "Adults can contract chickenpox if exposed.", "type": "ATTACKS", "target": "No, adults without chickenpox cannot get shingles.", "score": 0.6 },
      { "source": "Vaccination can prevent both diseases.", "type": "ATTACKS", "target": "No, adults without chickenpox cannot get shingles.", "score": 0.5 }
    ],
    "links": [
      { "url": "https://www.cdc.gov/shingles/about/index.html", "title": "CDC on Shingles" },
      { "url": "https://www.mayoclinic.org/diseases-conditions/shingles/symptoms-causes/syc-20347473", "title": "Mayo Clinic on Shingles" }
    ],
    "recommended_searches": {
      "paragraph_level": ["What causes shingles?", "Can adults get chickenpox?", "Shingles prevention methods."],
      "token_level": ["shingles disease", "chickenpox symptoms", "adults and chickenpox"],
      "relation_level": ["Can adults develop shingles without chickenpox?", "Effects of chickenpox vaccination."]
    }
  }
};
