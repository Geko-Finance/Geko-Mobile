import { StyleSheet, Text, View } from "react-native";

interface ScreenPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  footer?: React.ReactNode;
}

export function ScreenPlaceholder({
  eyebrow,
  title,
  description,
  footer,
}: ScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#070A12",
  },
  eyebrow: {
    marginBottom: 12,
    color: "#7DD3FC",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0,
  },
  description: {
    marginTop: 12,
    color: "#CBD5E1",
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    marginTop: 24,
  },
});
