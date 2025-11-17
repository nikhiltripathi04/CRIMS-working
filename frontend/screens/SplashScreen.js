import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    Platform,
    StatusBar,
    SafeAreaView,
    Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIpad = Platform.OS === 'ios' && screenWidth >= 768;

// Calculate responsive sizes based on screen dimensions
const scale = Math.min(screenWidth, screenHeight) / 375; // Base scale on iPhone 8 size
const responsiveSize = (size) => Math.round(size * scale);

export default function SplashScreen({ navigation }) {
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleScale = useRef(new Animated.Value(0.8)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const subtitleTranslateY = useRef(new Animated.Value(20)).current;
    const imageOpacity = useRef(new Animated.Value(0)).current;
    const imageScale = useRef(new Animated.Value(0.8)).current;
    const poweredByOpacity = useRef(new Animated.Value(0)).current;

    const dot1 = useRef(new Animated.Value(0.3)).current;
    const dot2 = useRef(new Animated.Value(0.3)).current;
    const dot3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // First animate the image
        Animated.parallel([
            Animated.timing(imageOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(imageScale, {
                toValue: 1,
                useNativeDriver: true,
            }),
        ]).start();

        // Then animate the title
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(titleOpacity, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.spring(titleScale, {
                    toValue: 1,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 500);

        setTimeout(() => {
            Animated.parallel([
                Animated.timing(subtitleOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.spring(subtitleTranslateY, {
                    toValue: 0,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 1000);

        // Animate the powered by text
        setTimeout(() => {
            Animated.timing(poweredByOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }).start();
        }, 1500);

        const animateDots = () => {
            const animate = (dot, delay) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(dot, {
                            toValue: 1,
                            duration: 600,
                            useNativeDriver: true,
                        }),
                        Animated.timing(dot, {
                            toValue: 0.3,
                            duration: 600,
                            useNativeDriver: true,
                        }),
                    ])
                );

            animate(dot1, 0).start();
            animate(dot2, 200).start();
            animate(dot3, 400).start();
        };

        animateDots();

        // Navigate after 5s based on onboarding flag
        const timer = setTimeout(async () => {
            const onboarded = await AsyncStorage.getItem('hasOnboarded');
            const target = onboarded ? 'Login' : 'Onboarding';
            navigation.replace(target);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0088E0" translucent />
            <View style={styles.fullScreenBackground} />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Image above CRIMS title */}
                    <Animated.View
                        style={{
                            opacity: imageOpacity,
                            transform: [{ scale: imageScale }],
                            marginBottom: responsiveSize(20)
                        }}
                    >
                        <Image source={require('../assets/images/3.png')} style={styles.image} />
                    </Animated.View>

                    <Animated.View
                        style={{
                            opacity: titleOpacity,
                            transform: [{ scale: titleScale }]
                        }}
                    >
                        <Text style={styles.titleText}>CRIMS</Text>
                    </Animated.View>

                    <Animated.View
                        style={{
                            marginTop: responsiveSize(20),
                            opacity: subtitleOpacity,
                            transform: [{ translateY: subtitleTranslateY }]
                        }}
                    >
                        <Text style={styles.subtitleText}>
                            Construction Resource & Inventory Management System
                        </Text>
                    </Animated.View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.loadingDots}>
                        {[dot1, dot2, dot3].map((dot, i) => (
                            <Animated.View
                                key={i}
                                style={{
                                    ...styles.dot,
                                    opacity: dot,
                                    transform: [{ scale: dot }],
                                }}
                            />
                        ))}
                    </View>

                    {/* Powered by FeathrTech */}
                    <Animated.View style={{
                        opacity: poweredByOpacity,
                        marginBottom: responsiveSize(20)
                    }}>
                        {/* <Text style={styles.poweredByText}>Powered by FeathrTech</Text> */}
                    </Animated.View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    fullScreenBackground: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#0088E0'
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#0088E0'
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: screenWidth * 0.08,
        backgroundColor: '#0088E0',
    },
    titleText: {
        fontSize: isIpad ? responsiveSize(40) : responsiveSize(40),
        fontWeight: '700',
        color: '#fff',
        letterSpacing: responsiveSize(2),
        textAlign: 'center'
    },
    subtitleText: {
        fontSize: isIpad ? responsiveSize(18) : responsiveSize(16),
        color: '#fff',
        textAlign: 'center',
        opacity: 0.9,
        fontWeight: '500',
        maxWidth: screenWidth * 0.85,
    },
    footer: {
        alignItems: 'center',
        marginBottom: screenHeight * 0.05,
    },
    loadingDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: responsiveSize(20)
    },
    dot: {
        width: isIpad ? responsiveSize(12) : responsiveSize(8),
        height: isIpad ? responsiveSize(12) : responsiveSize(8),
        borderRadius: isIpad ? responsiveSize(6) : responsiveSize(4),
        backgroundColor: '#fff',
        marginHorizontal: responsiveSize(6),
    },
    image: {
        width: isIpad ? screenWidth * 0.5 : screenWidth * 0.7,
        height: isIpad ? screenHeight * 0.4 : screenHeight * 0.3,
        resizeMode: 'contain',
        borderRadius: responsiveSize(15),
    },
    poweredByText: {
        fontSize: isIpad ? responsiveSize(16) : responsiveSize(14),
        color: '#fff',
        opacity: 0.8,
        fontWeight: '500',
        letterSpacing: responsiveSize(0.5),
    }
});
