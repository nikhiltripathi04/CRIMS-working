import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    SafeAreaView,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const TestScreen = () => {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#007ADC" />

            {/* Header Section */}
            <View style={styles.headerBackground}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Admin 1</Text>
                    </View>
                </SafeAreaView>
            </View>

            {/* Main Content Section */}
            <View style={styles.contentContainer}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Overview Section */}
                    <Text style={styles.sectionTitle}>Overview</Text>

                    <TouchableOpacity style={styles.card}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Sites</Text>
                            <Text style={styles.cardSubtitle}>2 Sites</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Sites</Text>
                            <Text style={styles.cardSubtitle}>2 Sites</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Sites</Text>
                            <Text style={styles.cardSubtitle}>2 Sites</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Sites</Text>
                            <Text style={styles.cardSubtitle}>2 Sites</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Communication & Logs Section */}
                    <Text style={styles.sectionTitle}>Communication & Logs</Text>

                    <TouchableOpacity style={styles.card}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Sites</Text>
                            <Text style={styles.cardSubtitle}>2 Sites</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Sites</Text>
                            <Text style={styles.cardSubtitle}>2 Sites</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#007ADC', // Primary Blue color from screenshot
    },
    headerBackground: {
        height: height * 0.22, // Occupies top part of screen
        backgroundColor: '#007ADC',
        paddingHorizontal: 24,
    },
    safeArea: {
        flex: 1,
    },
    headerContent: {
        marginTop: 20, // Space directly under status bar/safe area
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 28, // Matches large "Admin 1"
        fontWeight: '700',
        color: '#fff',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#F2F4F8', // Very light lavender/grey background
        borderTopLeftRadius: 30, // Large rounded corners
        borderTopRightRadius: 30,
        marginTop: -30, // Negative margin to overlap the blue header
        overflow: 'hidden',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 16,
        marginTop: 8,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16, // Smooth rounded corners
        paddingVertical: 20,
        paddingHorizontal: 24,
        marginBottom: 16,
        // Soft Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardContent: {
        alignItems: 'flex-start', // Left aligned
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '500', // Medium weight
        color: '#000',
        marginBottom: 6,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#8A8A8E', // Subtler grey for subtitle
    },
});

export default TestScreen;
