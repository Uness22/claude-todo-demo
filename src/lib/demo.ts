// Demo lecture used to test the full pipeline end-to-end:
// Upload → Analyze → Understand → Memorize → Recall → Quiz → Review
// Content follows standard HACCP (Codex Alimentarius) principles.

export const DEMO_TITLE = 'HACCP — Food Safety Fundamentals'

export const DEMO_TEXT = `
HACCP — Food Safety Fundamentals

HACCP (Hazard Analysis and Critical Control Points) is a preventive food safety system used to identify, evaluate, and control hazards. Unlike end-product testing, HACCP focuses on preventing hazards before they occur. This lecture covers the seven principles of HACCP, the flow of food through a kitchen, and the microbiological hazards that make people sick.

Introduction: Why HACCP Matters

Foodborne illness happens when contaminated food is eaten. Because reactive testing only checks the final product, it cannot guarantee safety of every unit. Therefore, a preventive system is required. HACCP is recognized internationally by Codex Alimentarius as the standard approach for food safety management.

Main Topics

1. HACCP Principles

A hazard is any biological, chemical, or physical agent in food that can cause illness or injury.

HACCP Principles:

1. Hazard Analysis: Identify all biological, chemical, and physical hazards likely to occur.
2. Critical Control Points (CCP): Identify steps where control can be applied to prevent, eliminate, or reduce a hazard to an acceptable level.
3. Critical Limits: Establish maximum or minimum values at each CCP, such as temperature or time.
4. Monitoring: Observe and measure the CCP at planned intervals.
5. Corrective Actions: Define what to do when monitoring shows a deviation from a critical limit.
6. Verification: Confirm that the HACCP system is working effectively.
7. Record Keeping: Maintain documents and records of the system.

A Critical Control Point (CCP) is a step at which control can be applied and is essential to prevent or eliminate a food safety hazard or reduce it to an acceptable level. A critical limit is the maximum or minimum value that separates acceptable from unacceptable at a CCP. If the temperature of cooked food stays below 5°C or above 60°C, bacterial growth is slowed; the danger zone between 5°C and 60°C is where bacteria multiply fastest.

2. Flow of Food

Receiving → Storage → Preparation → Cooking → Cooling → Serving

Every step of the food flow must be controlled. During receiving, reject any shipment with damaged packaging or temperatures above 4°C for chilled goods. Storage keeps raw foods below ready-to-eat foods to prevent dripping contamination. Preparation requires handwashing and sanitized surfaces. Cooking reaches the required internal temperature for the food type. Cooling moves cooked food from 60°C to 21°C within 2 hours, and from 21°C to 5°C within 4 more hours. Serving must happen promptly, and food must not sit in the danger zone longer than 2 hours.

3. Microbiological Hazards

Common foodborne pathogens include Salmonella, E. coli, Listeria, Staphylococcus, and Clostridium. Salmonella is commonly found in poultry and eggs, while E. coli O157:H7 is associated with undercooked ground beef. Listeria monocytogenes can grow even at refrigeration temperatures, unlike most other pathogens. Staphylococcus aureus produces a heat-stable toxin that is not destroyed by reheating. Clostridium perfringens forms spores that survive cooking and germinate during slow cooling.

Bacteria multiply fastest between 5°C and 60°C, which is called the danger zone. Bacteria need four conditions to grow: moisture, nutrients, the right temperature, and time. When any one of these is controlled, growth slows down. For example, drying food removes moisture, and freezing stops growth because time at low temperature replaces moisture control.

4. Prerequisite Programs

Prerequisite programs are the foundation practices that support HACCP. They include personal hygiene, cleaning and sanitizing, pest control, supplier approval, and staff training. Because prerequisite programs control general hygiene, HACCP can focus on specific process hazards. A CCP is different from a prerequisite program: a prerequisite program addresses general hygiene conditions, whereas a CCP addresses a specific step with a measurable critical limit.

Summary

HACCP is a preventive system built on seven principles: hazard analysis, CCP identification, critical limits, monitoring, corrective actions, verification, and record keeping. The food flow from receiving to serving must be controlled at every step. Pathogens such as Salmonella, E. coli, Listeria, Staphylococcus, and Clostridium cause foodborne illness, and the danger zone between 5°C and 60°C must be avoided. When monitoring shows a deviation, corrective actions must be taken and recorded immediately.
`

export const DEMO_EXAM_DAYS = 14
