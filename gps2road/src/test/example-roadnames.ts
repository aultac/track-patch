import type { RoadType, RoadTypeInfo } from '../types.js';

type RawExampleRoadnames = {
  [name: string]: string | { type: RoadType, number?: number, ramp?: true },
};

export type ExampleRoadNames = {
  [name: string]: RoadTypeInfo,
};

export const _roadnames: RawExampleRoadnames = {

  // Toll roads: the prefix in MileMarkers is "T"
  // This is only T_80 and T_90
  // Just replace "TOLL RD" with "INTERSTATE 80", and then change mile markers from T_ to I_
  "EB TOLL RD": { type: 'INTERSTATE', number: 80 },
     "TOLL RD": { type: 'INTERSTATE', number: 80 },
   "TOLL RD N": { type: 'INTERSTATE', number: 80 },

  // Interstates
  "E INTERSTATE 265": { type: 'INTERSTATE', number: 265 },
  "E UNITED STATES HIGHWAY 12": { type: 'INTERSTATE', number: 12 },
  "E UNITED STATES HIGHWAY 24 W": { type: 'INTERSTATE', number: 24 },
  "INTERSTATE 164": { type: 'INTERSTATE', number: 164 },
  "INTERSTATE 265 E": { type: 'INTERSTATE', number: 265 },
  "INTERSTATE 64 NW": { type: 'INTERSTATE', number: 64 },
  "INTERSTATE 65 NORTHBOUND": { type: 'INTERSTATE', number: 65 },
  "INTERSTATE 65 S MM 151": { type: 'INTERSTATE', number: 65 }, // ignore the mile marker here
  "INTERSTATE 70 WB": { type: 'INTERSTATE', number: 70 },
  "INTERSTATE 70-B WB COLL/DIST": { type: 'INTERSTATE', number: 70 },
  "INTERSTATE 74 E-BOUND": { type: 'INTERSTATE', number: 74 },
  "INTERSTATE 80 - 90": { type: 'INTERSTATE', number: 80 }, // manually checked mile markers, this is T_80
  "INTERSTATE 80/90": { type: 'INTERSTATE', number: 80 }, // manually checked mile markers, this is T_80
  "INTERSTATE 80&90": { type: 'INTERSTATE', number: 80 }, // manually checked mile markers, this is T_80
  "INTERSTATE EB 94": { type: 'INTERSTATE', number: 94 },
  "N UNITED STATES HIGHWAY 41 & 50 BYPASS": { type: 'INTERSTATE', number: 41 },


  // What to do with these?
          "E STATE ROAD 45 46 BYPASS": { type: 'STATE', number: 45, }, // ??
             "E STATE ROAD 38 RAMP S": { type: 'STATE', number: 38, ramp: true },
                "RAMP SR 1 TO E I-74": { type: 'STATE', number: 1, ramp: true },
          "STATE ROAD 14 INTERCHANGE": { type: 'STATE', number: 14, ramp: true },
            "STATE ROAD 49&LAPORTE A": { type: 'STATE', number: 49, ramp: true },
           "SR 62 ON RAMP TO I265 WB": { type: 'STATE', number: 62, ramp: true },
  "E UNITED STATES HIGHWAY 24 ACCESS": { type: 'INTERSTATE', number: 24, ramp: true },
  "E UNITED STATES HIGHWAY 24 RAMP A": { type: 'INTERSTATE', number: 24, ramp: true },
                         "465 RAMP E": { type: 'INTERSTATE', number: 465, ramp: true },
                         "465 RAMP W": { type: 'INTERSTATE', number: 465, ramp: true },
                      "97 N I 65 OFF": { type: 'INTERSTATE', number: 97, ramp: true },
                       "97 N I 65 ON": { type: 'INTERSTATE', number: 97, ramp: true },
                      "97 S I 65 OFF": { type: 'INTERSTATE', number: 97, ramp: true },
                       "97 S I 65 ON": { type: 'INTERSTATE', number: 97, ramp: true },
               "I-275 SPLIT TO US 50": { type: 'INTERSTATE', number: 275, ramp: true },
                "I-69 NB 340 ON-RAMP": { type: 'INTERSTATE', number: 69, ramp: true },
               "I-69 SB 340 OFF-RAMP": { type: 'INTERSTATE', number: 69, ramp: true },
          "INTERSTATE 265 E OFF RAMP": { type: 'INTERSTATE', number: 265, ramp: true },
           "INTERSTATE 265 E ON RAMP": { type: 'INTERSTATE', number: 265, ramp: true },
          "INTERSTATE 465 002 RAMP A": { type: 'INTERSTATE', number: 465, ramp: true },
          "INTERSTATE 465 014 RAMP E": { type: 'INTERSTATE', number: 465, ramp: true },
                "INTERSTATE 64 RAMPS": { type: 'INTERSTATE', number: 64, ramp: true },
              "INTERSTATE 65 RAMP NB": { type: 'INTERSTATE', number: 65, ramp: true },
      "INTERSTATE 65 RAMP NORTHBOUND": { type: 'INTERSTATE', number: 65, ramp: true },
            "INTERSTATE 65 REST STOP": { type: 'INTERSTATE', number: 65, ramp: true },
                "INTERSTATE 65-168-B": { type: 'INTERSTATE', number: 65, ramp: true }, 
         "INTERSTATE 69 SW RAMP 144D": { type: 'INTERSTATE', number: 69, ramp: true }, 
           "INTERSTATE 70 069 RAMP D": { type: 'INTERSTATE', number: 70, ramp: true }, 
     "INTERSTATE 74 E-BOUND OFF-RAMP": { type: 'INTERSTATE', number: 74, ramp: true }, 
              "INTERSTATE 74 OFFRAMP": { type: 'INTERSTATE', number: 74, ramp: true }, 
          "INTERSTATE 74 RAMP SYSTEM": { type: 'INTERSTATE', number: 74, ramp: true }, 
           "INTERSTATE 74 W OFF-RAMP": { type: 'INTERSTATE', number: 74, ramp: true }, 
  "INTERSTATE 80-90 CLOSED EXIT MM 146": { type: 'INTERSTATE', number: 80, ramp: true }, 
             "INTERSTATE 80&90 PLZ A": { type: 'INTERSTATE', number: 80, ramp: true }, // manually checked mile markers, this is T_80
              "INTERSTATE 94&SR249 A": { type: 'INTERSTATE', number: 94, ramp: true }, // How in the world to figure out this is a ramp??
               "INTERSTATE 94&US20 H": { type: 'INTERSTATE', number: 94, ramp: true }, // How in the world to figure out this is a ramp??
    "N US HIGHWAY 41 & 50 CLOVERLEAF": { type: 'INTERSTATE', number: 41, ramp: true },
       "RAMP I-275 SPLIT TO NB I-275": { type: 'INTERSTATE', number: 275, ramp: true },
              "RAMP I65 NB / SR 38 E": { type: 'INTERSTATE', number: 65, ramp: true },
     "RAMP US HWY 52 W \ FRONTAGE RD": { type: 'INTERSTATE', number: 52, ramp: true },
                    "TOLL ROAD PLZ B": { type: 'INTERSTATE', number: 80, ramp: true },
                  "US 31 N TO E 00NS": { type: 'INTERSTATE', number: 31, ramp: true }, // manually checked this, it is a ramp
  
  
  // State highways
  
    "E STATE HIGHWAY 46": { type: 'STATE', number: 46 },
       "E STATE ROAD 10": { type: 'STATE', number: 10 },
   "E STATE ROAD 135 ST": { type: 'STATE', number: 135 },
     "E STATE ROAD 26 S": { type: 'STATE', number: 26 },
      "E STATE ROAD 524": { type: 'STATE', number: 524 },
   "E STATE ROAD RD 120": { type: 'STATE', number: 120 },
            "HWY 135 SW": { type: 'STATE', number: 135 },
           "E HWY 11 SE": { type: 'STATE', number: 11 },
             "E HWY 330": { type: 'STATE', number: 330 },
        "IN 244 MAIN ST": { type: 'STATE', number: 244 },
       "IN 3 N. MAIN ST": { type: 'STATE', number: 3 },
       "IN 44 W. 1ST ST": { type: 'STATE', number: 44 },
    "N STATE ROAD 37 45": { type: 'STATE', number: 37 }, // manually checked this, post name is S_37
  
  // Co roads/Streets:
                "10 E": 'LOCAL',
               "100 W": 'LOCAL',
            "01ST AVE": 'LOCAL',
          "04TH AVE E": 'LOCAL',
    "1 UNIVERSITY AVE": 'LOCAL',
            "102ND PL": 'LOCAL',
         "11TH CIR SE": 'LOCAL',
       "1400 N ELM RD": 'LOCAL',
     "18TH ST / 150 E": 'LOCAL',
                 "641": 'LOCAL',
    "10-7-05 FIELD SAYS NO SIGN": 'LOCAL',
             "20' ALY": 'LOCAL',
       "201 TURKEY LK": 'LOCAL',
  "20TH CENTURY CHEVY DR": 'LOCAL',
  "2385 W ORLAND RD B": 'LOCAL',
         "23RD 1/2 DR": 'LOCAL',
  "2ND AV FREEMAN FLD": 'LOCAL',
    "38TH ST NORTH DR": 'LOCAL',
        "4-H TRAIL DR": 'LOCAL',
          "40 & 8 AVE": 'LOCAL',
  "45TH AVE/45TH ST/GLEN PARK AVE": 'LOCAL',
  "45TH AVE/45TH ST/GLEN PARK AVE ST": 'LOCAL',
            "45TH TER": 'LOCAL',
      "5-G FARM LN NE": 'LOCAL',
  "52 MOBILE HOME ESTS": 'LOCAL',
        "550 E DETOUR": 'LOCAL',
            "6 1/2 ST": 'LOCAL',
  "600S/CENTER/HADLEY ROUNDABOUT": 'LOCAL',
      "6828 N 300 W A": 'LOCAL',
      "6TH STREET ALY": 'LOCAL',
            "AARON DR": 'LOCAL',
  "ACCESS DRIVE TO HOSPITAL EMT": 'LOCAL',
       "E LINCOLN HWY": 'LOCAL',
       "E ST CLAIR ST": 'LOCAL',
      "E ST OF DREAMS": 'LOCAL',
        "E STATE BLVD": 'LOCAL',
        'E STOP 11 RD': 'LOCAL',
        'E THE AVENUE': 'LOCAL',
   'E THIRTY FIFTH ST': 'LOCAL',
     'E Z ACRES LN NE': 'LOCAL',
               'EDITH': 'LOCAL',
        'ENGINEER TRL': 'LOCAL',
         'EMS T12A LN': 'LOCAL',
    'EVERGREEN TR VOP': 'LOCAL',
                   'F': 'LOCAL',
                'GONE': 'LOCAL',
         'HIGHWAY AVE': 'LOCAL',
                   'I': 'LOCAL',
  'INTERSTATE PLAZA DR': 'LOCAL',
       'INTERSTATE RD': 'LOCAL',
            'N 4TH ST': 'LOCAL',
         'N HIGHWAY S': 'LOCAL',
        'OLD STATE RD': 'LOCAL',
        'OLD STATE ROAD 101': 'LOCAL',
  'OLD UNITED STATES HIGHWAY 24 E': 'LOCAL', // anything starting wtih "OLD" is county
                'RAMP': 'LOCAL',
        'S HIGHWAY ST': 'LOCAL',
       "S STATE LINE RD": 'LOCAL', // manually checked this, it is Ohio SR 1
       "TOLL RD WILLOWCREEK": 'LOCAL', // manuall checked this, it is a driveway that attaches to 80/90 toll road
};

// Process all the string-only values into objects of type 'COUNTY'
export const exampleRoadnames: { [name: string]: RoadTypeInfo } = {};
// Put the names on AND replace 'LOCAL' with an object:
for (const [name, val] of Object.entries(_roadnames)) {
  if (typeof val === 'string') {
    exampleRoadnames[name] = { type: 'LOCAL', name };
    continue;
  }
  exampleRoadnames[name] = { ...val, name };
}
