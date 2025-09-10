/// <reference types="jest" />

// Manual mock for react-native-video - handles video component per @testing-unified.mdc
const Video = jest.fn().mockImplementation((_props) => null)

export default Video
