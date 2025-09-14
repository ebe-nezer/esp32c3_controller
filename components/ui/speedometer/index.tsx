import React from "react";
import RNSpeedometer, {
  Arc,
  Background,
  DangerPath,
  Indicator,
  Marks,
  Needle,
  Progress,
} from "react-native-cool-speedometer";
import { useTheme } from "react-native-paper";

type Props = {
  value: number;
  max: number;
  min?: number;
  angle?: number;
  width?: number;
  height?: number;
};

const Speedometer = ({
  value,
  max,
  min = -40,
  angle,
  width = 100,
  height,
}: Props) => {
  const { fonts, colors } = useTheme();
  return (
    <RNSpeedometer
      value={value}
      min={min}
      max={max}
      angle={angle}
      fontFamily="squada-one"
      easing={(t) => t}
      duration={10}
      accentColor={colors.primary}
      useNativeDriver={true}
      width={width}
      height={height || width}
    >
      <Background />
      <Arc arcWidth={4} />
      <Needle baseOffset={40} circleRadius={30} circleColor={colors.primary} />
      <DangerPath />
      <Indicator
        fixValue={true}
        fontSize={16}
        fontWeight={"bolder"}
        fontFamily={fonts.bodyMedium.fontFamily}
      />
      <Progress arcWidth={10} />
      <Marks step={10} />
    </RNSpeedometer>
  );
};

export default Speedometer;
