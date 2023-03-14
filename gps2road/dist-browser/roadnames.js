import log from './log.js';
const { info } = log.get('roadnames');
// The only thing needed for the road type is the geofulladdress.  However,
// if you want to debug, or get a unique identifier for the road, you'll want
// the other stuff in the RoadNameInfo.  So, this is just a simple wrapper
// for the 
export function guessRoadType(road) {
    return roadNameToType(road.geofulladdress);
}
// For now, these are all outside the function to avoid constantly re-instantiating them
const directionAbbrev = '(N|E|S|W|NB|EB|SB|WB|NORTHBOUND|EASTBOUND|SOUTHBOUND|WESTBOUND)';
const directionFull = '(NORTH|EAST|SOUTH|WEST)';
const direction = `(${directionAbbrev}|${directionFull})`.replace(')|(', '');
const federalNames = '(INTERSTATE|I|UNITED STATES|US)';
const highway = '(HIGHWAY|HWY)';
const state = '(STATE ROAD|STATE RD|SR|STATE ROAD RD|STATE HIGHWAY|STATE HWY|IN|HWY)';
const rampSeparator = '(&|\\|/| +TO +)';
const reToll1 = new RegExp('TOLL *(RD|ROAD)');
const reFederal1 = new RegExp(`^(${direction} +)?${federalNames}( +${direction})?( +${highway})?[\- ]?([0-9]{1,4})`);
const reFederal1Relaxed = new RegExp(`${federalNames}( +${highway})?[\- ]?([0-9]{1,4}) +${rampSeparator}`);
const reFirstFullNumber = new RegExp(`^[^0-9]*([0-9]+)`);
const reState1 = new RegExp(`^(${direction} +)?${state} *[0-9]+( +${direction})?`);
const reState1Relaxed = new RegExp(`${state} *[0-9]+.*${rampSeparator}`);
export function roadNameToType(geofulladdress) {
    let name = geofulladdress;
    // Cleanup: trim, replace any multi-spaces
    name = name.trim().replace(/ +/g, ' ');
    // First, turn "toll rd" into what it actually is: INTERSTATE 80/90
    name = name.replace(reToll1, 'INTERSTATE 80/90');
    // (direction) INTERSTATE <number> <direction>
    // (direction) I-<number> <direction>
    // (direction) I <number> <direction>
    // (direction) UNITED STATES HIGHWAY <number> <direction>
    // (direction) US <number> <direction>
    // (direction) US HWY <number> <direction>
    // (direction) US HIGHWAY <number> <direction>
    const fedmatches = name.match(reFederal1);
    const numbermatches = name.match(reFirstFullNumber);
    let ret = { name: geofulladdress, type: 'UNKNOWN' };
    // The one special case I can't figure out how to map:
    if (name === 'INTERSTATE 80/90 WILLOWCREEK') { // actual name is "TOLL RD WILLOWCREEK"
        ret.type = 'LOCAL';
        return ret;
    }
    // If clearly a federal highway:
    if (fedmatches) {
        ret.type = 'INTERSTATE';
        if (!numbermatches) {
            throw new Error(`ERROR: Road name (${name}) matched as INTERSTATE, but there was no number in the string`);
        }
        ret.number = +(numbermatches[1]);
        if (isRamp(name))
            ret.ramp = true;
        return ret;
    }
    // Otherwise, if clearly a state highway
    const statematches = name.match(reState1);
    if (statematches) {
        ret.type = 'STATE';
        if (!numbermatches) {
            throw new Error(`ERROR: Road name (${name}) matched as STATE, but there was no number in the string`);
        }
        ret.number = +(numbermatches[1]);
        if (isRamp(name))
            ret.ramp = true;
        return ret;
    }
    // Otherwise, if clearly a ramp:
    if (isRamp(name)) {
        if (name.match(reFederal1Relaxed)) {
            ret.type = 'INTERSTATE';
        }
        else if (name.match(reState1Relaxed)) {
            ret.type = 'STATE';
        }
        else {
            ret.type = 'INTERSTATE';
        }
        if (!numbermatches) {
            throw new Error(`ERROR: Road name (${name}) matched as a INTERSTATE through isRamp, but there was no number in the string`);
        }
        ret.number = +(numbermatches[1]);
        ret.ramp = true;
        return ret;
    }
    else {
        ret.type = 'LOCAL';
    }
    return ret;
}
const ramp = new RegExp('(ACCESS|RAMP|INTERCHANGE| OFF| ON|SPLIT|RAMPS|ON-RAMP|OFF-RAMP|REST|OFFRAMP|ONRAMP|SYSTEM|CLOVERLEAF|PLZ| TO|EXIT)');
// INTERSTATE 65-168-B
const numberWithExitLetter = new RegExp('[0-9]+-[0-9]+-[A-Z]');
// INTERSTATE 94&SR249 A
// INTERSTATE 94&US20 H
const endsWithExitLetter = new RegExp('&.*([0-9]+|LAPORTE) +[A-Z]$');
function isRamp(str) {
    if (!str.match(reFirstFullNumber))
        return false; // If no number, it's not a ramp.
    if (str.match(ramp))
        return true;
    if (str.match(numberWithExitLetter))
        return true;
    if (str.match(endsWithExitLetter))
        return true;
    return false;
}
//# sourceMappingURL=roadnames.js.map