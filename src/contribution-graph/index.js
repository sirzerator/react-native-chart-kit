import React from "react";
import PropTypes from "prop-types";
import { View } from "react-native";
import { Svg, G, Text, Rect } from "react-native-svg";
import _ from "lodash";
import AbstractChart from "../abstract-chart";
import {
  DAYS_IN_WEEK,
  MILLISECONDS_IN_ONE_DAY,
  MONTH_LABELS
} from "./constants";
import {
  shiftDate,
  getBeginningTimeForDate,
  convertToDate
} from "./dateHelpers";

const SQUARE_SIZE = 20;
const LABEL_GUTTER_SIZE = 8;
class ContributionGraph extends AbstractChart {
  constructor(props) {
    super(props);
    this.state = {
      valueCache: this.getValueCache(props.values)
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      valueCache: this.getValueCache(nextProps.values)
    });
  }

  getSquareSizeWithGutter() {
    return (this.props.squareSize || SQUARE_SIZE) + this.props.gutterSize;
  }

  getMonthLabelSize() {
    let { squareSize = SQUARE_SIZE } = this.props;

    if (!this.props.showMonthLabels) {
      return 0;
    }

    return squareSize;
  }

  getStartDate() {
    return shiftDate(this.getEndDate(), -this.props.numDays + 1); // +1 because endDate is inclusive
  }

  getEndDate() {
    return getBeginningTimeForDate(convertToDate(this.props.endDate));
  }

  getStartDateWithEmptyDays() {
    return shiftDate(this.getStartDate(), -this.getNumEmptyDaysAtStart());
  }

  getNumEmptyDaysAtStart() {
    return this.getStartDate().getDay();
  }

  getNumEmptyDaysAtEnd() {
    return DAYS_IN_WEEK - 1 - this.getEndDate().getDay();
  }

  getWeekCount() {
    const numDaysRoundedToWeek =
      this.props.numDays +
      this.getNumEmptyDaysAtStart() +
      this.getNumEmptyDaysAtEnd();
    return Math.ceil(numDaysRoundedToWeek / DAYS_IN_WEEK);
  }

  getWeekWidth() {
    return DAYS_IN_WEEK * this.getSquareSizeWithGutter();
  }

  getWidth() {
    return (
      this.getWeekCount() * this.getSquareSizeWithGutter() -
      this.props.gutterSize
    );
  }

  getHeight() {
    return (
      this.getWeekWidth() + (this.getMonthLabelSize() - this.props.gutterSize)
    );
  }

  getValueCache(values) {
    return values.reduce((memo, value) => {
      const date = convertToDate(value.date);
      const index = Math.floor(
        (date - this.getStartDateWithEmptyDays()) / MILLISECONDS_IN_ONE_DAY
      );
      memo[index] = {
        value,
        title: this.props.titleForValue
          ? this.props.titleForValue(value)
          : null,
        tooltipDataAttrs: this.getTooltipDataAttrsForValue(value)
      };
      return memo;
    }, {});
  }

  getValueForIndex(index) {
    if (this.state.valueCache[index]) {
      return this.state.valueCache[index].value;
    }
    return null;
  }

  getClassNameForIndex(index) {
    if (this.state.valueCache[index]) {
      if (this.state.valueCache[index].value) {
        const count = this.state.valueCache[index].value.count;
        if (count) {
          const opacity = (count * 0.15 > 1 ? 1 : count * 0.15) + 0.15;
          return this.props.chartConfig.color(opacity);
        }
      }
    }
    return this.props.chartConfig.color(0.15);
  }

  getTitleForIndex(index) {
    if (this.state.valueCache[index]) {
      return this.state.valueCache[index].title;
    }
    return this.props.titleForValue ? this.props.titleForValue(null) : null;
  }

  getTooltipDataAttrsForIndex(index) {
    if (this.state.valueCache[index]) {
      return this.state.valueCache[index].tooltipDataAttrs;
    }
    return this.getTooltipDataAttrsForValue({ date: null, count: null });
  }

  getTooltipDataAttrsForValue(value) {
    const { tooltipDataAttrs } = this.props;

    if (typeof tooltipDataAttrs === "function") {
      return tooltipDataAttrs(value);
    }
    return tooltipDataAttrs;
  }

  getTransformForWeek(weekIndex) {
    if (this.props.horizontal) {
      return [weekIndex * this.getSquareSizeWithGutter(), this.getMonthLabelSize()];
    }
    return [0, weekIndex * this.getSquareSizeWithGutter()];
  }

  getSquareCoordinates(dayIndex) {
    if (this.props.horizontal) {
      return [0 + this.getSquareXOffset(), dayIndex * this.getSquareSizeWithGutter()];
    }
    return [dayIndex * this.getSquareSizeWithGutter() + this.getSquareXOffset(), 0];
  }

  getLabelCoordinates(weekIndex) {
    if (this.props.horizontal) {
      return [
        weekIndex * this.getSquareSizeWithGutter(),
        this.getMonthLabelSize()
      ];
    }

    return [
      0,
      weekIndex * this.getSquareSizeWithGutter() + (this.getSquareSizeWithGutter() / 2)
    ];
  }

  handleClick(value) {
    if (this.props.onClick) {
      this.props.onClick(value);
    }
  }

  renderSquare(dayIndex, index) {
    const indexOutOfRange =
      index < this.getNumEmptyDaysAtStart() ||
      index >= this.getNumEmptyDaysAtStart() + this.props.numDays;
    if (indexOutOfRange && !this.props.showOutOfRangeDays) {
      return null;
    }
    const [x, y] = this.getSquareCoordinates(dayIndex);
    const { squareSize = SQUARE_SIZE } = this.props;
    return (
      <Rect
        key={index}
        width={squareSize}
        height={squareSize}
        x={x}
        y={y}
        title={this.getTitleForIndex(index)}
        fill={this.getClassNameForIndex(index)}
        {...this.getTooltipDataAttrsForIndex(index)}
      />
    );
  }

  renderWeek(weekIndex) {
    const [x, y] = this.getTransformForWeek(weekIndex);
    return (
      <G key={weekIndex} x={x} y={y}>
        {_.range(DAYS_IN_WEEK).map(dayIndex =>
          this.renderSquare(dayIndex, weekIndex * DAYS_IN_WEEK + dayIndex)
        )}
      </G>
    );
  }

  renderAllWeeks() {
    return _.range(this.getWeekCount()).map(weekIndex =>
      this.renderWeek(weekIndex)
    );
  }

  isMonthLabel(endOfWeek) {
    return endOfWeek.getDate() >= 1 && endOfWeek.getDate() <= DAYS_IN_WEEK;
  }

  renderMonthLabels() {
    if (!this.props.showMonthLabels) {
      return null;
    }
    const weekRange = _.range(this.getWeekCount());
    return weekRange.map(weekIndex => {
      const endOfWeek = shiftDate(
        this.getStartDateWithEmptyDays(),
        weekIndex * DAYS_IN_WEEK
      );
      const [x, y] = this.getLabelCoordinates(weekIndex);
      return this.isMonthLabel(endOfWeek) ? (
        <Text
          key={weekIndex}
          x={x}
          y={y - (this.props.horizontal ? LABEL_GUTTER_SIZE : 0)}
          {...this.getPropsForLabels()}
        >
          {MONTH_LABELS[this.props.locale][endOfWeek.getMonth()]}
        </Text>
      ) : null;
    });
  }

  renderWeekLabels() {
    if (!this.props.showWeekLabels) {
      return null;
    }

    const weekRange = _.range(this.getWeekCount());
    return weekRange.map(weekIndex => {
      const endOfWeek = shiftDate(
        this.getStartDateWithEmptyDays(),
        weekIndex * DAYS_IN_WEEK
      );
      const [x, y] = this.getLabelCoordinates(weekIndex);
      return !this.isMonthLabel(endOfWeek) ? (
        <Text
          key={weekIndex}
          x={x}
          y={y - (this.props.horizontal ? LABEL_GUTTER_SIZE : 0)}
          {...this.getPropsForLabels()}
        >
          {`${endOfWeek.getDate()}`}
        </Text>
      ) : null;
    });
  }

  getBoundingHeight() {
    if (this.props.horizontal) {
      return this.getWeekWidth() + 2 * this.getMonthLabelSize();
    }

    return this.getWeekCount() * this.getSquareSizeWithGutter();
  }

  getBoundingWidth() {
    if (this.props.horizontal) {
      return this.getWeekCount() * this.getSquareSizeWithGutter();
    }

    return this.getWeekWidth() + this.getMonthLabelSize();
  }

  getSquareXOffset() {
    if (this.props.horizontal) {
      return 0;
    }

    return this.getMonthLabelSize();
  }

  render() {
    const { style = {} } = this.props;
    let { borderRadius = 0 } = style;
    if (!borderRadius && this.props.chartConfig.style) {
      const stupidXo = this.props.chartConfig.style.borderRadius;
      borderRadius = stupidXo;
    }
    return (
      <View style={style}>
        <Svg height={this.getBoundingHeight()} width={this.getBoundingWidth()}>
          {this.renderDefs({
            width: this.getBoundingWidth(),
            height: this.getBoundingHeight(),
            ...this.props.chartConfig
          })}
          <Rect
            width="100%"
            height={this.getBoundingHeight()}
            rx={borderRadius}
            ry={borderRadius}
            fill="url(#backgroundGradient)"
          />
          <G>{this.renderWeekLabels()}</G>
          <G>{this.renderMonthLabels()}</G>
          <G>{this.renderAllWeeks()}</G>
        </Svg>
      </View>
    );
  }
}

ContributionGraph.ViewPropTypes = {
  endDate: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date)
  ]), // end of date range
  gutterSize: PropTypes.number, // size of space between squares
  horizontal: PropTypes.bool, // whether to orient horizontally or vertically
  locale: PropTypes.string,
  numDays: PropTypes.number, // number of days back from endDate to show
  onClick: PropTypes.func, // callback function when a square is clicked
  showMonthLabels: PropTypes.bool, // whether to show month labels
  showOutOfRangeDays: PropTypes.bool, // whether to render squares for extra days in week after endDate, and before start date
  showWeekLabels: PropTypes.bool, // whether to show month labels
  squareSize: PropTypes.number, // size of squares
  titleForValue: PropTypes.func, // function which returns title text for value
  tooltipDataAttrs: PropTypes.oneOfType([PropTypes.object, PropTypes.func]), // data attributes to add to square for setting 3rd party tooltips, e.g. { 'data-toggle': 'tooltip' } for bootstrap tooltips
  values: PropTypes.arrayOf(
    // array of objects with date and arbitrary metadata
    PropTypes.shape({
      date: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.instanceOf(Date)
      ]).isRequired
    }).isRequired
  ).isRequired,
};

ContributionGraph.defaultProps = {
  endDate: new Date(),
  gutterSize: 1,
  horizontal: true,
  locale: 'en',
  numDays: 200,
  showMonthLabels: true,
  showOutOfRangeDays: false,
  showWeekLabels: false,
  squareSize: SQUARE_SIZE,
};

export default ContributionGraph;
