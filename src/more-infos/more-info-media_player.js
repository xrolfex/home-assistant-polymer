import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

const ATTRIBUTE_CLASSES = ['volume_level'];

export default new Polymer({
  is: 'more-info-media_player',

  properties: {
    hass: {
      type: Object,
    },

    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },

    isOff: {
      type: Boolean,
      value: false,
    },

    isPlaying: {
      type: Boolean,
      value: false,
    },

    isMuted: {
      type: Boolean,
      value: false,
    },

    source: {
      type: String,
      value: '',
    },

    sourceIndex: {
      type: Number,
      value: 0,
      observer: 'handleSourceChanged',
    },

    volumeSliderValue: {
      type: Number,
      value: 0,
    },

    supportsPause: {
      type: Boolean,
      value: false,
    },

    supportsVolumeSet: {
      type: Boolean,
      value: false,
    },

    supportsVolumeMute: {
      type: Boolean,
      value: false,
    },

    supportsPreviousTrack: {
      type: Boolean,
      value: false,
    },

    supportsNextTrack: {
      type: Boolean,
      value: false,
    },

    supportsTurnOn: {
      type: Boolean,
      value: false,
    },

    supportsTurnOff: {
      type: Boolean,
      value: false,
    },

    supportsVolumeButtons: {
      type: Boolean,
      value: false,
    },

    supportsSelectSource: {
      type: Boolean,
      value: false,
    },

    hasMediaControl: {
      type: Boolean,
      value: false,
    },

  },

  stateObjChanged(newVal) {
    if (newVal) {
      const hasMediaStates = ['playing', 'paused', 'unknown'];

      this.isOff = newVal.state === 'off';
      this.isPlaying = newVal.state === 'playing';
      this.hasMediaControl = hasMediaStates.indexOf(newVal.state) !== -1;
      this.volumeSliderValue = newVal.attributes.volume_level * 100;
      this.isMuted = newVal.attributes.is_volume_muted;
      this.source = newVal.attributes.source;
      this.supportsPause = (newVal.attributes.supported_media_commands & 1) !== 0;
      this.supportsVolumeSet = (newVal.attributes.supported_media_commands & 4) !== 0;
      this.supportsVolumeMute = (newVal.attributes.supported_media_commands & 8) !== 0;
      this.supportsPreviousTrack = (newVal.attributes.supported_media_commands & 16) !== 0;
      this.supportsNextTrack = (newVal.attributes.supported_media_commands & 32) !== 0;
      this.supportsTurnOn = (newVal.attributes.supported_media_commands & 128) !== 0;
      this.supportsTurnOff = (newVal.attributes.supported_media_commands & 256) !== 0;
      this.supportsVolumeButtons = (newVal.attributes.supported_media_commands & 1024) !== 0;
      this.supportsSelectSource = (newVal.attributes.supported_media_commands & 2048) !== 0;

      if (newVal.attributes.source_list !== undefined) {
        this.sourceIndex = newVal.attributes.source_list.indexOf(this.source);
      }
    }

    this.async(() => this.fire('iron-resize'), 500);
  },

  computeClassNames(stateObj) {
    return attributeClassNames(stateObj, ATTRIBUTE_CLASSES);
  },

  computeIsOff(stateObj) {
    return stateObj.state === 'off';
  },

  computeMuteVolumeIcon(isMuted) {
    return isMuted ? 'mdi:volume-off' : 'mdi:volume-high';
  },

  computeHideVolumeButtons(isOff, supportsVolumeButtons) {
    return !supportsVolumeButtons || isOff;
  },

  computeShowPlaybackControls(isOff, hasMedia) {
    return !isOff && hasMedia;
  },

  computePlaybackControlIcon() {
    if (this.isPlaying) {
      return this.supportsPause ? 'mdi:pause' : 'mdi:stop';
    }
    return 'mdi:play';
  },

  computeHidePowerButton(isOff, supportsTurnOn, supportsTurnOff) {
    return isOff ? !supportsTurnOn : !supportsTurnOff;
  },

  computeHideSelectSource(isOff, supportsSelectSource) {
    return !isOff && supportsSelectSource;
  },

  computeSelectedSource(stateObj) {
    return stateObj.attributes.source_list.indexOf(stateObj.attributes.source);
  },

  handleTogglePower() {
    this.callService(this.isOff ? 'turn_on' : 'turn_off');
  },

  handlePrevious() {
    this.callService('media_previous_track');
  },

  handlePlaybackControl() {
    this.callService('media_play_pause');
  },

  handleNext() {
    this.callService('media_next_track');
  },

  handleSourceChanged(sourceIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (!this.stateObj
        || this.stateObj.attributes.source_list === undefined
        || sourceIndex < 0
        || sourceIndex >= this.stateObj.attributes.source_list.length
    ) {
      return;
    }

    const sourceInput = this.stateObj.attributes.source_list[sourceIndex];
    if (sourceInput === this.stateObj.attributes.source) {
      return;
    }

    this.callService('select_source', { source: sourceInput });
  },

  handleVolumeTap() {
    if (!this.supportsVolumeMute) {
      return;
    }
    this.callService('volume_mute', { is_volume_muted: !this.isMuted });
  },

  handleVolumeUp() {
    const obj = this.$.volumeUp;
    this.handleVolumeWorker('volume_up', obj, true);
  },

  handleVolumeDown() {
    const obj = this.$.volumeDown;
    this.handleVolumeWorker('volume_down', obj, true);
  },

  handleVolumeWorker(service, obj, force) {
    if (force || (obj !== undefined && obj.pointerDown)) {
      this.callService(service);
      this.async(() => this.handleVolumeWorker(service, obj, false), 500);
    }
  },

  volumeSliderChanged(ev) {
    const volPercentage = parseFloat(ev.target.value);
    const vol = volPercentage > 0 ? volPercentage / 100 : 0;
    this.callService('volume_set', { volume_level: vol });
  },

  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    this.hass.serviceActions.callService('media_player', service, serviceData);
  },
});
