module.exports = {
  "modifier": "-",
  "prefix_number_with_modifier": true,
  "breakpoint_logic": "min-width",
  "breakpoints": {
    "small": {
      "size": "510px",
      "syntax": "\\\\@sm"
    },
    "medium": {
      "size": "780px",
      "syntax": "\\\\@md"
    },
    "large": {
      "size": "1020px",
      "syntax": "\\\\@lg"
    }
  },
  "axis": {
    "top": {
      "property": [
        "top"
      ],
      "syntax": "t"
    },
    "bottom": {
      "property": [
        "bottom"
      ],
      "syntax": "b"
    },
    "left": {
      "property": [
        "left"
      ],
      "syntax": "l"
    },
    "right": {
      "property": [
        "right"
      ],
      "syntax": "r"
    },
    "y": {
      "property": [
        "top",
        "bottom"
      ],
      "syntax": "y"
    },
    "x": {
      "property": [
        "left",
        "right"
      ],
      "syntax": "x"
    }
  },
  "spacing": {
    "ratio": [
      1.067,
      1.1,
      1.12,
      1.2
    ],
    "neg_ratio": [
      1.067,
      1.1,
      1.12,
      1.2
    ],
    "max_step": 10,
    "min_step": 5,
    "base_positive": 1,
    "base_negative": 1
  },
  "box_shadow": {
    "ratio": [
      1.1,
      1.132,
      1.21,
      1.3
    ],
    "steps": 4,
    "base": 0.25
  },
  "font_size": {
    "ratio": [
      1.067,
      1.1,
      1.12,
      1.2
    ],
    "neg_ratio": [
      1.067,
      1.1,
      1.12,
      1.2
    ],
    "max_step": 7,
    "min_step": 3,
    "base_positive": 1,
    "base_negative": 1
  },
  "modules": {
    "color": true,
    "spacing": true,
    "font_size": true,
    "box_shadow": true
  },
  "colors": {
    "lighter_steps": 5,
    "darker_steps": 5,
    "hues": {
      "slate": {
        "base": "#64748B",
        "lighter_end": 95,
        "darker_end": 10,
        "lighter_sat_increase": 0,
        "darker_sat_increase": 0
      },
      "rose": {
        "base": "#F43F5E",
        "lighter_end": 97,
        "darker_end": 10,
        "lighter_sat_increase": 0,
        "darker_sat_increase": 0
      },
      "indigo": {
        "base": "#4F46E5",
        "lighter_end": 95,
        "darker_end": 10,
        "lighter_sat_increase": 0,
        "darker_sat_increase": 0
      },
      "emerald": {
        "base": "#10B981",
        "lighter_end": 95,
        "darker_end": 10,
        "lighter_sat_increase": 0,
        "darker_sat_increase": 0
      },
      "amber": {
        "base": "#F59E0B",
        "lighter_end": 97,
        "darker_end": 10,
        "lighter_sat_increase": 2,
        "darker_sat_increase": 2
      }
    }
  }
};
